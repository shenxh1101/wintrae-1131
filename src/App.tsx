import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import MainMenu from "@/pages/MainMenu";
import TutorialLevel from "@/pages/TutorialLevel";
import OrderLevel from "@/pages/OrderLevel";
import TimedLevel from "@/pages/TimedLevel";
import ReviewPage from "@/pages/ReviewPage";
import ReviewList from "@/pages/ReviewList";
import Leaderboard from "@/pages/Leaderboard";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <MainMenu />
            </motion.div>
          }
        />
        <Route
          path="/tutorial"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <TutorialLevel />
            </motion.div>
          }
        />
        <Route
          path="/order"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <OrderLevel />
            </motion.div>
          }
        />
        <Route
          path="/timed"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <TimedLevel />
            </motion.div>
          }
        />
        <Route
          path="/review"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <ReviewList />
            </motion.div>
          }
        />
        <Route
          path="/review/:sessionId"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <ReviewPage />
            </motion.div>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Leaderboard />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return <AnimatedRoutes />;
}
