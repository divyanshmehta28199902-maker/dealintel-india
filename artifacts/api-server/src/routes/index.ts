import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import listingsRouter from "./listings";
import contactRequestsRouter from "./contact_requests";
import privateDealsRouter from "./private_deals";
import watchlistRouter from "./watchlist";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import pipelineRouter from "./pipeline";
import storageRouter from "./storage";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/listings", listingsRouter);
router.use("/contact-requests", contactRequestsRouter);
router.use("/deals/private", privateDealsRouter);
router.use("/watchlist", watchlistRouter);
router.use("/messages", messagesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/pipeline", pipelineRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use(storageRouter);

export default router;
