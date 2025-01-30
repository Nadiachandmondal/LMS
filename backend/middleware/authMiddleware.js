import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateAccessToken } from '../utils/jwt.utils.js';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';

import dotenv from 'dotenv';
dotenv.config();

export const auth = asyncHandler(async (req, res, next) => {
  
  try {
    // Get token from authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    

    if (!token) {
      throw new ApiError(401, "Unauthorized request - No token provided");
    }

    // Verify token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists in either Student or Teacher model
    let user = await Student.findById(decodedToken?._id).select("-password -refreshToken");
    
    if (!user) {
      user = await Teacher.findById(decodedToken?._id).select("-password -refreshToken");
    }

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Add user and role to request object
    req.user = user;
    req.userType = user instanceof Student ? 'student' : 'teacher';
    
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, "Invalid token");
    }
    if (error.name === 'TokenExpiredError') {
      
      window.location.href = "/";
      throw new ApiError(401, "Token has expired");
    }
    throw error;
  }
});

// Optional: Specific middleware for student routes
export const requireStudent = asyncHandler(async (req, res, next) => {
  if (req.userType !== 'student') {
    throw new ApiError(403, "Access denied. Students only.");
  }
  next();
});

// Optional: Specific middleware for teacher routes
export const requireTeacher = asyncHandler(async (req, res, next) => {
  if (req.userType !== 'teacher') {
    throw new ApiError(403, "Access denied. Teachers only.");
  }
  next();
});

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Access Forbidden");
    }
    next();
  };
};

export { authorizeRole };
