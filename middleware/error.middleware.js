const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  const code    = err.statusCode || 500;
  const message = err.message    || "Internal server error";
  res.status(code).json({ success: false, message });
};

export default errorHandler;
