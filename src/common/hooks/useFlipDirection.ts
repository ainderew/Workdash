import { useLayoutEffect, useState, type RefObject } from 'react';

function getScrollParent(el: HTMLElement): HTMLElement {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
    parent = parent.parentElement;
  }
  return document.documentElement;
}

function useFlipDirection(
  anchorRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  flyoutHeight = 420,
) {
  const [direction, setDirection] = useState<'down' | 'up'>('down');

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) {
      setDirection('down');
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const scrollParent = getScrollParent(anchorRef.current);
    const containerBottom =
      scrollParent === document.documentElement
        ? window.innerHeight
        : scrollParent.getBoundingClientRect().bottom;
    const spaceBelow = containerBottom - rect.bottom;
    setDirection(spaceBelow < flyoutHeight ? 'up' : 'down');
  }, [isOpen, flyoutHeight]);

  return direction;
}

export default useFlipDirection;
