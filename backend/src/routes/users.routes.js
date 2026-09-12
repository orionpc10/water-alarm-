import { Router } from "express";
import {
    getCurrentUser,
    updateUserSettings,
    deleteUserAccount,
} from "../controllers/users.controllers.js";
import { verifyClerkAuth } from "../middlewares/auth.middlewares.js";

const router = Router();

// Protect all user endpoints with Clerk authentication
router.use(verifyClerkAuth);

// Authenticated user operations on /me
router
    .route("/me")
    .get(getCurrentUser)
    .patch(updateUserSettings)
    .delete(deleteUserAccount);

export default router;

