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
| APPLY VENDOR
|--------------------------------------------------------------------------
*/

export const applyVendor = async (
  req,
  res
) => {

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

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !address ||
      !subscriptionId ||
      !planId
    ) {

      return error(
        res,
        "All required fields are mandatory",
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
    | CHECK EXISTING VENDOR
    |--------------------------------------------------------------------------
    */

    const existingVendor =
      await Vendor.findOne({
        email: email.toLowerCase(),
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
    | PARSE ARRAYS
    |--------------------------------------------------------------------------
    */

    let parsedVehicleTypes = [];
    let parsedScrapTypes = [];

    try {

      parsedVehicleTypes =
        JSON.parse(vehicleTypes);

      parsedScrapTypes =
        JSON.parse(scrapTypes);

    } catch {

      return error(
        res,
        "Invalid vehicleTypes or scrapTypes format",
        400
      );
    }

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

/*
|--------------------------------------------------------------------------
| GET NEARBY VENDORS
|--------------------------------------------------------------------------
*/

export const getNearbyVendors =
  async (req, res) => {

    try {

      const {
        lat,
        lng,
      } = req.query;

      const {
        scrapType,
        vehicleType,
      } = req.query;

      if (
        lat === undefined ||
        lng === undefined
      ) {

        return error(
          res,
          "lat and lng query params are required",
          400
        );
      }

      const userLat =
        Number(lat);

      const userLng =
        Number(lng);

      if (
        !Number.isFinite(userLat) ||
        !Number.isFinite(userLng)
      ) {

        return error(
          res,
          "lat and lng must be valid numbers",
          400
        );
      }

      const filter = {

        approvalStatus:
          "approved",

        status:
          "active",

        "location.lat": {
          $exists: true,
          $ne: null,
        },

        "location.lng": {
          $exists: true,
          $ne: null,
        },
      };

      if (vehicleType) {
        filter.vehicleTypes =
          vehicleType;
      }

      if (scrapType) {
        filter.scrapTypes =
          scrapType;
      }

      const vendors =
        await Vendor.find(filter)

          .select(
            "name phone location vehicleTypes scrapTypes"
          );

      const nearby = vendors

        .map((vendor) => {

          const vendorLat =
            Number(
              vendor.location?.lat
            );

          const vendorLng =
            Number(
              vendor.location?.lng
            );

          if (
            !Number.isFinite(
              vendorLat
            ) ||

            !Number.isFinite(
              vendorLng
            )
          ) {
            return null;
          }

          const distance =
            haversineKm(
              userLat,
              userLng,
              vendorLat,
              vendorLng
            );

          if (distance > 10) {
            return null;
          }

          return {

            _id:
              vendor._id,

            name:
              vendor.name,

            phone:
              vendor.phone,

            location:
              vendor.location,

            distanceKm:
              Number(
                distance.toFixed(2)
              ),
          };
        })

        .filter(Boolean)

        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
        );

      return success(
        res,
        {
          vendors: nearby,
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
| APPROVE VENDOR
|--------------------------------------------------------------------------
*/

export const approveVendor =
  async (req, res) => {

    try {

      const vendor =
        await Vendor.findById(
          req.params.id
        );

      if (!vendor) {

        return error(
          res,
          "Vendor not found",
          404
        );
      }

      if (
        vendor.approvalStatus ===
        "approved"
      ) {

        return error(
          res,
          "Vendor is already approved",
          400
        );
      }

      vendor.approvalStatus =
        "approved";

      vendor.subscriptionStatus =
        "active";

      await vendor.save();

      await sendVendorApprovalEmail(
        vendor.email,
        "approved"
      );

      await createNotification({

        recipientId:
          vendor._id,

        recipientModel:
          "Vendor",

        message:
          "Your vendor account has been approved. You can now accept requests.",

        type:
          "vendor_approved",
      });

      return success(
        res,
        {},
        "Vendor approved"
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
| REJECT VENDOR
|--------------------------------------------------------------------------
*/

export const rejectVendor =
  async (req, res) => {

    try {

      const vendor =
        await Vendor.findById(
          req.params.id
        );

      if (!vendor) {

        return error(
          res,
          "Vendor not found",
          404
        );
      }

      vendor.approvalStatus =
        "rejected";

      await vendor.save();

      await sendVendorApprovalEmail(
        vendor.email,
        "rejected"
      );

      return success(
        res,
        {},
        "Vendor rejected"
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
| BLOCK VENDOR
|--------------------------------------------------------------------------
*/

export const blockVendor =
  async (req, res) => {

    try {

      const vendor =
        await Vendor.findById(
          req.params.id
        );

      if (!vendor) {

        return error(
          res,
          "Vendor not found",
          404
        );
      }

      vendor.status =
        vendor.status === "active"
          ? "blocked"
          : "active";

      await vendor.save();

      return success(
        res,
        {
          status:
            vendor.status,
        },
        `Vendor ${vendor.status}`
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
| UPDATE VENDOR
|--------------------------------------------------------------------------
*/

export const updateVendor =
  async (req, res) => {

    try {

      const {
        name,
        phone,
        address,
        lat,
        lng,
        vehicleTypes,
        scrapTypes,
      } = req.body;

      if (
        !name &&
        !phone &&
        !address &&
        !lat &&
        !lng &&
        !vehicleTypes &&
        !scrapTypes
      ) {

        return error(
          res,
          "Provide at least one field to update",
          400
        );
      }

      const update = {};

      if (name) {
        update.name = name;
      }

      if (phone) {
        update.phone = phone;
      }

      if (address) {
        update.address =
          address;
      }

      if (lat && lng) {

        update.location = {
          lat: Number(lat),
          lng: Number(lng),
        };
      }

      if (vehicleTypes) {
        update.vehicleTypes =
          vehicleTypes;
      }

      if (scrapTypes) {
        update.scrapTypes =
          scrapTypes;
      }

      const vendor =
        await Vendor.findByIdAndUpdate(
          req.params.id,
          update,
          {
            new: true,
          }
        ).select(
          "-password -resetPasswordToken -resetPasswordExpiry"
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
        { vendor },
        "Profile updated"
      );

    } catch (err) {

      return error(
        res,
        err.message
      );
    }
  };