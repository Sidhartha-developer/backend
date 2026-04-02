import crypto  from "crypto";
import bcrypt  from "bcryptjs";
import User    from "../models/User.js";
import Vendor  from "../models/Vendor.js";
import Admin   from "../models/Admin.js";
import Plan from "../models/Plan.js";
import VendorSubscription from "../models/VendorSubscription.js";
import { generateToken }  from "../utils/jwt.utils.js";
import { success, error } from "../utils/response.utils.js";
import { uploadImage }    from "../services/cloudinary.service.js";
import { sendResetEmail } from "../services/email.service.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password)
      return error(res, "Name, email and password are required", 400);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return error(res, "Invalid email format", 400);

    if (password.length < 6)
      return error(res, "Password must be at least 6 characters", 400);

    const exists = await User.findOne({ email });
    if (exists) return error(res, "Email already registered", 409);

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ name, email, password: hashed, phone, address });
    const token  = generateToken({ id: user._id, role: "user" });

    return success(res, { token, user: { id: user._id, name, email, role: "user" } }, "Registered successfully", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role = "user" } = req.body;

    if (!email || !password)
      return error(res, "Email and password are required", 400);

    if (!["user", "vendor", "admin"].includes(role))
      return error(res, "Invalid role", 400);

    const Model   = role === "admin" ? Admin : role === "vendor" ? Vendor : User;
    const account = await Model.findOne({ email });

    if (!account)
      return error(res, "Invalid email or password", 401);

    const match = await bcrypt.compare(password, account.password);
    if (!match) return error(res, "Invalid email or password", 401);

    if (account.status === "blocked")
      return error(res, "Your account has been blocked. Contact support.", 403);

    if (role === "vendor" && account.approvalStatus === "rejected")
      return error(res, "Your vendor application was rejected.", 403);

    const token = generateToken({ id: account._id, role });

    return success(res, {
      token,
      user: { id: account._id, name: account.name, email, role },
      ...(role === "vendor" && { approvalStatus: account.approvalStatus }),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

export const registerVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      lat,
      lng,
      vehicleTypes,
      scrapTypes,
      planId,
      subscriptionId,
      paymentId,
      paymentOrderId,
      paymentSignature,
    } = req.body;

    if (!name || !email || !password || !phone || !address)
      return error(res, "Name, email, password, phone and address are required", 400);

    if (!planId || !subscriptionId || !paymentId || !paymentOrderId || !paymentSignature) {
      return error(res, "Valid plan payment is required for vendor registration", 400);
    }

    if (!vehicleTypes?.length || !scrapTypes?.length) {
      return error(res, "Vehicle types and scrap types are required", 400);
    }

    const exists = await Vendor.findOne({ email });
    if (exists) return error(res, "Email already registered", 409);

    const [plan, subscription] = await Promise.all([
      Plan.findOne({ _id: planId, isActive: { $ne: false } }),
      VendorSubscription.findById(subscriptionId),
    ]);

    if (!plan) return error(res, "Selected plan not found", 404);
    if (!subscription) return error(res, "Subscription not found", 404);

    if (subscription.paymentStatus !== "paid") {
      return error(res, "Payment is not verified for this subscription", 400);
    }

    if (subscription.vendor) {
      return error(res, "This subscription has already been used", 400);
    }

    if (
      subscription.plan.toString() !== planId ||
      subscription.razorpayOrderId !== paymentOrderId ||
      subscription.razorpayPaymentId !== paymentId ||
      subscription.razorpaySignature !== paymentSignature
    ) {
      return error(res, "Payment details do not match subscription", 400);
    }

    const hashed = await bcrypt.hash(password, 12);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);

    // Creating vendor first (without image)
    const vendor = await Vendor.create({
      name,
      email,
      password: hashed,
      phone,
      address,
      vehicleTypes,
      scrapTypes,
      location: {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      },
      paymentId,
      paymentOrderId,
      paymentStatus: "paid",
      currentPlan: plan._id,
      subscriptionStatus: "active",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    });

    subscription.vendor = vendor._id;
    subscription.status = "active";
    subscription.startDate = startDate;
    subscription.endDate = endDate;
    subscription.applicantName = name;
    subscription.applicantEmail = email;
    await subscription.save();

    await VendorSubscription.updateMany(
      {
        _id: { $ne: subscription._id },
        vendor: null,
        plan: plan._id,
        applicantEmail: email.toLowerCase(),
        paymentStatus: "pending",
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
        },
      }
    );

    vendor.currentSubscription = subscription._id;
    await vendor.save();

    //Try uploading image (do NOT block registration)
    if (req.file) {
      uploadImage(req.file.buffer)
        .then(async (uploaded) => {
          vendor.idProofUrl = uploaded.url;
          vendor.idProofPublicId = uploaded.publicId;
          await vendor.save();
        })
        .catch((err) => {
          console.error("Image upload failed:", err.message);
        });
    }

    return success(
      res,
      {
        id: vendor._id,
        name,
        email,
        plan: {
          id: plan._id,
          name: plan.name,
          price: plan.price,
          durationInDays: plan.durationInDays,
        },
      },
      "Registration submitted. Awaiting admin approval.",
      201
    );

  } catch (err) {
    return error(res, err.message);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, role = "user" } = req.body;

    if (!email) return error(res, "Email is required", 400);

    const Model   = role === "vendor" ? Vendor : User;
    const account = await Model.findOne({ email });

    if (!account)
      return success(res, {}, "If that email exists, a reset link has been sent.");

    const rawToken = crypto.randomBytes(32).toString("hex");
    account.resetPasswordToken  = crypto.createHash("sha256").update(rawToken).digest("hex");
    account.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1hr
    await account.save();

    await sendResetEmail(email, rawToken);

    return success(res, {}, "Reset link sent to your email.");
  } catch (err) {
    return error(res, err.message);
  }
};

export const showResetForm = (req, res) => {
  res.render("reset-password", {
    token:   req.params.token,
    error:   null,
    success: null,
  });
};

// update resetPassword to render EJS instead of JSON when called from form
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6)
      return error(res, "Password must be at least 6 characters", 400);

    const hashed  = crypto.createHash("sha256").update(req.params.token).digest("hex");

    // find the account with valid token
    const user   = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpiry: { $gt: Date.now() } });
    const vendor = !user
      ? await Vendor.findOne({ resetPasswordToken: hashed, resetPasswordExpiry: { $gt: Date.now() } })
      : null;

    const account = user || vendor;
    if (!account) return error(res, "Reset link is invalid or has expired", 400);

    const Model = user ? User : Vendor;

    // update password + clear token fields in one shot
    await Model.findByIdAndUpdate(account._id, {
      password:            await bcrypt.hash(password, 12),
      resetPasswordToken:  null,
      resetPasswordExpiry: null,
    });

    return success(res, {}, "Password reset successful. You can now log in.");
  } catch (err) {
    return error(res, err.message);
  }
};
