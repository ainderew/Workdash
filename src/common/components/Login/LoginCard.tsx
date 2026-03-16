import React, { type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
}

export function LoginCard({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="wd-card w-full max-w-sm overflow-hidden rounded-2xl p-8 shadow-lg"
    >
      {/* Logo / Wordmark */}
      <div className="mb-6 text-center">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--wd-text-primary)" }}
        >
          WorkDash
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--wd-text-muted)" }}
        >
          Your virtual office
        </p>
      </div>

      {children}
    </motion.div>
  );
}
