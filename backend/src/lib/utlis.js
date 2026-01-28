import jwt from 'jsonwebtoken';
import { ENV } from './env.js';
export const generateToken = (userId, res) => {
    const { JWT_SECRET } = ENV;
    if(!JWT_SECRET){
        throw new Error("JWT_SECRET is not set in environment variables");
    }
    const token = jwt.sign({ userId}, JWT_SECRET, {
        expiresIn: '7d',
    });

    res.cookie("jwt", token, {
        httpOnly: true, // prevent XSS attacks: cross-site scripting
        secure: ENV.NODE_ENV === 'development' ? false : true, // set to true in production
        sameSite: 'strict', // CSRF protection: cross-site request forgery
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });  
    return token;
};

