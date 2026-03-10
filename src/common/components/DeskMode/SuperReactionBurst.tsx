import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Lottie from 'lottie-react';

type SuperReactionBurstProps = {
    animationData: object | null;
    burstId: string | null;
    onComplete: () => void;
};

function SuperReactionBurst({
    animationData,
    burstId,
    onComplete,
}: SuperReactionBurstProps) {
    return (
        <AnimatePresence>
            {burstId && animationData ? (
                <motion.div
                    key={burstId}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                    style={{ width: 48, height: 48, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                >
                    <Lottie
                        animationData={animationData}
                        loop={false}
                        onComplete={onComplete}
                        style={{ width: 48, height: 48 }}
                    />
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default React.memo(SuperReactionBurst);
