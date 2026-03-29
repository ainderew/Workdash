import React, { memo } from 'react';
import type { AwardTagProps } from './_types';

function AwardTag({ type, label, size = 'sm' }: AwardTagProps) {
  const slug = type.toLowerCase().replace(/_/g, '-');

  const isXs = size === 'xs';

  return (
    <span
      className={`wd-award-tag relative inline-flex items-center font-semibold uppercase shrink-0 overflow-hidden ${
        isXs
          ? 'gap-1 px-1.5 py-[3px] text-[9px] tracking-wider leading-[14px] rounded-[2px]'
          : 'gap-1.5 px-2 py-[4px] text-[11px] tracking-wide leading-[16px] rounded-[3px]'
      }`}
      data-award={slug}
    >
      {label}
      <span
        className={`wd-award-tag-icon shrink-0 inline-block ${isXs ? 'size-2.5' : 'size-3'}`}
        aria-hidden="true"
      />
    </span>
  );
}

export default memo(AwardTag);
