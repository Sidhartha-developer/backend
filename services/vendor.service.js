import Vendor from "../models/Vendor.js";
import { haversineKm } from "../utils/geo.utils.js";

export const findNearestVendors = async (lat, lng, radiusKm = 10) => {
  const vendors = await Vendor.find({ approvalStatus: "approved", status: "active" });

  return vendors.filter(
    (v) =>
      v.location?.lat &&
      v.location?.lng &&
      haversineKm(lat, lng, v.location.lat, v.location.lng) <= radiusKm
  );
};
