import bcrypt from "bcryptjs";

import Vendor from "../models/Vendor.js";
import Plan from "../models/Plan.js";
import VendorSubscription from "../models/VendorSubscription.js";

import {
  success,
  error,
} from "../utils/response.utils.js";

import {
  createNotification,
} from "../services/notification.service.js";

import {
  sendVendorApprovalEmail,
} from "../services/email.service.js";

import {
  uploadImage,
} from "../services/cloudinary.service.js";

import {
  haversineKm,
} from "../utils/geo.utils.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const validateVendorFields = ({
  name,
  email,
  password,
  phone,
  address,
  subscriptionId,
  planId,
}) => {

  if (
    !name ||
    !email ||
    !password ||
    !phone ||
    !address ||
    !subscriptionId ||
    !planId
  ) {

    return "All required fields are mandatory";
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {

    return "Invalid email format";
  }

  if (password.length < 8) {

    return "Password must be at least 8 characters";
  }

  if (phone.length < 10) {

    return "Invalid phone number";
  }

  return null;
};

const parseArrayField = (
  value
) => {

  try {

    return JSON.parse(value);

  } catch {

    return null;
  }
};

/*
|--------------------------------------------------------------------------
| CHECK EMAIL
|--------------------------------------------------------------------------
*/

export const checkVendorEmail =
async (req, res) => {

  try {

    const { email } =
      req.body;

    if (!email) {

      return error(
        res,
        "Email is required",
        400
      );
    }

    const existingVendor =
      await Vendor.findOne({

        email:
          email.toLowerCase(),
      });

    return success(
      res,
      {
        exists:
          !!existingVendor,
      }
    );

  } catch (err) {

    return error(
      res,
      err.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| CHECK PHONE
|--------------------------------------------------------------------------
*/

export const checkVendorPhone =
async (req, res) => {

  try {

    const { phone } =
      req.body;

    if (!phone) {

      return error(
        res,
        "Phone is required",
        400
      );
    }

    const existingVendor =
      await Vendor.findOne({
        phone,
      });

    return success(
      res,
      {
        exists:
          !!existingVendor,
      }
    );

  } catch (err) {

    return error(
      res,
      err.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| APPLY VENDOR
|--------------------------------------------------------------------------
*/

export const applyVendor =
async (req, res) => {

  try {

    const {
      name,
      email,
      password,
      phone,
      address,
      vehicleTypes,
      scrapTypes,
      subscriptionId,
      planId,
      lat,
      lng,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | VALIDATIONS
    |--------------------------------------------------------------------------
    */

    const validationError =
      validateVendorFields({

        name,
        email,
        password,
        phone,
        address,
        subscriptionId,
        planId,
      });

    if (validationError) {

      return error(
        res,
        validationError,
        400
      );
    }

    if (!req.file) {

      return error(
        res,
        "ID proof is required",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PARSE ARRAYS
    |--------------------------------------------------------------------------
    */

    const parsedVehicleTypes =
      parseArrayField(
        vehicleTypes
      );

    const parsedScrapTypes =
      parseArrayField(
        scrapTypes
      );

    if (
      !parsedVehicleTypes ||
      !parsedScrapTypes
    ) {

      return error(
        res,
        "Invalid vehicleTypes or scrapTypes format",
        400
      );
    }

    if (
      !parsedVehicleTypes.length
    ) {

      return error(
        res,
        "Select at least one vehicle type",
        400
      );
    }

    if (
      !parsedScrapTypes.length
    ) {

      return error(
        res,
        "Select at least one scrap type",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EXISTING VENDOR
    |--------------------------------------------------------------------------
    */

    const existingVendor =
      await Vendor.findOne({

        email:
          email.toLowerCase(),
      });

    if (existingVendor) {

      return error(
        res,
        "Vendor already exists with this email",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EXISTING PHONE
    |--------------------------------------------------------------------------
    */

    const existingPhone =
      await Vendor.findOne({
        phone,
      });

    if (existingPhone) {

      return error(
        res,
        "Phone number already registered",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK SUBSCRIPTION
    |--------------------------------------------------------------------------
    */

    const subscription =
      await VendorSubscription.findById(
        subscriptionId
      );

    if (!subscription) {

      return error(
        res,
        "Subscription not found",
        404
      );
    }

    if (
      subscription.paymentStatus !==
      "paid"
    ) {

      return error(
        res,
        "Payment verification incomplete",
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK PLAN
    |--------------------------------------------------------------------------
    */

    const plan =
      await Plan.findById(planId);

    if (!plan) {

      return error(
        res,
        "Plan not found",
        404
      );
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD ID PROOF
    |--------------------------------------------------------------------------
    */

    const uploadedImage =
      await uploadImage(
        req.file.buffer
      );

    /*
    |--------------------------------------------------------------------------
    | HASH PASSWORD
    |--------------------------------------------------------------------------
    */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    /*
    |--------------------------------------------------------------------------
    | CREATE VENDOR
    |--------------------------------------------------------------------------
    */

    const vendor =
      await Vendor.create({

        name,

        email:
          email.toLowerCase(),

        password:
          hashedPassword,

        phone,

        address,

        location: {

          lat: lat
            ? Number(lat)
            : null,

          lng: lng
            ? Number(lng)
            : null,
        },

        vehicleTypes:
          parsedVehicleTypes,

        scrapTypes:
          parsedScrapTypes,

        idProofUrl:
          uploadedImage.url,

        idProofPublicId:
          uploadedImage.publicId,

        approvalStatus:
          "pending",

        paymentStatus:
          "paid",

        paymentId:
          subscription.razorpayPaymentId,

        paymentOrderId:
          subscription.razorpayOrderId,

        currentPlan:
          plan._id,

        currentSubscription:
          subscription._id,

        subscriptionStatus:
          "inactive",
      });

    /*
    |--------------------------------------------------------------------------
    | UPDATE SUBSCRIPTION
    |--------------------------------------------------------------------------
    */

    subscription.vendor =
      vendor._id;

    await subscription.save();

    /*
    |--------------------------------------------------------------------------
    | CREATE NOTIFICATION
    |--------------------------------------------------------------------------
    */

    await createNotification({

      recipientId:
        vendor._id,

      recipientModel:
        "Vendor",

      message:
        "Your vendor onboarding request has been submitted successfully.",

      type:
        "vendor_application_submitted",
    });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return success(
      res,
      {
        vendor,
      },
      "Vendor application submitted successfully"
    );

  } catch (err) {

    return error(
      res,
      err.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL VENDORS
|--------------------------------------------------------------------------
*/

export const getAllVendors =
async (req, res) => {

  try {

    const {
      approvalStatus,
      status,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (approvalStatus) {
      filter.approvalStatus =
        approvalStatus;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.name = {
        $regex: search,
        $options: "i",
      };
    }

    const vendors =
      await Vendor.find(filter)

        .select(
          "-password -resetPasswordToken -resetPasswordExpiry"
        )

        .populate(
          "currentPlan",
          "name code price durationInDays"
        )

        .populate(
          "currentSubscription",
          "status paymentStatus startDate endDate"
        )

        .skip(
          (page - 1) * limit
        )

        .limit(Number(limit))

        .sort({
          createdAt: -1,
        });

    const total =
      await Vendor.countDocuments(
        filter
      );

    return success(
      res,
      {
        vendors,
        total,
        page: Number(page),
      }
    );

  } catch (err) {

    return error(
      res,
      err.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET VENDOR BY ID
|--------------------------------------------------------------------------
*/

export const getVendorById =
async (req, res) => {

  try {

    const vendor =
      await Vendor.findById(
        req.params.id
      )

        .select(
          "-password -resetPasswordToken -resetPasswordExpiry"
        )

        .populate(
          "currentPlan",
          "name code price durationInDays"
        )

        .populate(
          "currentSubscription",
          "status paymentStatus startDate endDate"
        );

    if (!vendor) {

      return error(
        res,
        "Vendor not found",
        404
      );
    }

    return success(
      res,
      { vendor }
    );

  } catch (err) {

    return error(
      res,
      err.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET MY PROFILE
|--------------------------------------------------------------------------
*/

export const getMyVendorProfile =
async (req, res) => {

  try {

    const vendor =
      await Vendor.findById(
        req.user.id
      )

        .select(
          "-password -resetPasswordToken -resetPasswordExpiry"
        )

        .populate(
          "currentPlan",
          "name code price durationInDays"
        )

        .populate(
          "currentSubscription",
          "status paymentStatus startDate endDate"
        );

    if (!vendor) {

      return error(
        res,
        "Vendor not found",
        404
      );
    }

    return success(
      res,
      { vendor }
    );

  } catch (err) {

    return error(
      res,
      err.message
    );
  }
};