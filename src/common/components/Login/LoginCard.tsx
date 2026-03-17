import React, { type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
}

const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: easeOutQuart,
      staggerChildren: 0.12,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutQuart },
  },
};

export function LoginCard({ children }: Props) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 w-full max-w-[420px] rounded-3xl px-10 py-14"
      style={{
        backgroundColor: "var(--wd-login-surface)",
        boxShadow:
          "0 25px 60px -15px rgb(0 0 0 / 0.3), 0 0 80px -20px var(--wd-login-accent-soft)",
      }}
    >
      <motion.div variants={fadeUp} className="mb-10 text-center">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: "var(--wd-login-text)" }}
        >
          Work
          <span
            className="relative"
            style={{ color: "var(--wd-login-accent)" }}
          >
            Dash
            <span
              className="wd-login-accent-line absolute -bottom-1.5 left-0 h-[2.5px] w-full rounded-full"
              style={{ backgroundColor: "var(--wd-login-accent)" }}
            />
          </span>
        </h1>
        <p
          className="mt-3 text-base"
          style={{ color: "var(--wd-login-text-muted)" }}
        >
          Step into your virtual office
        </p>
      </motion.div>

      <motion.div variants={fadeUp}>{children}</motion.div>
    </motion.div>
  );
}
