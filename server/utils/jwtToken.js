const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 60 * 24 * 1000
    ),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" ? true : false,
  };

  res.status(statusCode)
    .cookie("token", token, options)
    .cookie("role", user.role, options)
    .json({
      success: true,
      // Token is stored in httpOnly cookie, not returned in JSON for security
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
      message: "Logged in successfully",
    });
};

export default sendToken;
