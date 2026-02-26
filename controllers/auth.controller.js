import crypto  from "crypto";
import bcrypt  from "bcryptjs";
import User    from "../models/User.js";
import Vendor  from "../models/Vendor.js";
import Admin   from "../models/Admin.js";
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
    const { name, email, password, phone, address, lat, lng } = req.body;

    if (!name || !email || !password || !phone || !address)
      return error(res, "Name, email, password, phone and address are required", 400);

    const exists = await Vendor.findOne({ email });
    if (exists) return error(res, "Email already registered", 409);

    const hashed = await bcrypt.hash(password, 12);

    // Creating vendor first (without image)
    const vendor = await Vendor.create({
      name,
      email,
      password: hashed,
      phone,
      address,
      location: {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      },
    });

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
      { id: vendor._id, name, email },
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