// The full pointer/mouse sequence a real click produces; verified to work on Drive's breadcrumb and menu.
const CLICK_SEQUENCE = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const;
// Drive's menu activates an item only after it has been highlighted by hovering.
const HOVER_SEQUENCE = ['pointerover', 'mouseover', 'pointerenter', 'mouseenter', 'pointermove', 'mousemove'] as const;

const dispatch = (target: Element, type: string): void => {
  const init: MouseEventInit = { bubbles: true, cancelable: true, composed: true, button: 0 };
  const isPointer = type.startsWith('pointer') && typeof PointerEvent === 'function';
  target.dispatchEvent(isPointer ? new PointerEvent(type, init) : new MouseEvent(type, init));
};

export const simulateClick = (target: Element): void => {
  CLICK_SEQUENCE.forEach((type) => dispatch(target, type));
};

export const simulateHover = (target: Element): void => {
  HOVER_SEQUENCE.forEach((type) => dispatch(target, type));
};

export const simulateEscape = (target: Element): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
  );
};
