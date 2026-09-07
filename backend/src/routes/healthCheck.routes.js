import {Router} from "express";
import {healthCheck} from "../controllers/heatlthCheck.controllers.js";

const router = Router()
router.route("/").get(healthCheck)

export default router