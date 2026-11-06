import React from 'react';

const GOLD = '#D4AF37';

/**
 * The anatomical map. Deliberately a stylised figure rather than a photo: a
 * body diagram is for pointing at a place, and a stylised one is honest about
 * not being a clinical drawing.
 *
 * The same geometry is used front and back — only the torso names change —
 * because a traveller is locating a place on themselves, not reading anatomy.
 */

const CENTER_FRONT = [
  { id: 'head', label: 'Head', el: 'ellipse', props: { cx: 110, cy: 58, rx: 28, ry: 36 } },
  { id: 'neck', label: 'Neck', el: 'rect', props: { x: 100, y: 93, width: 20, height: 16, rx: 6 } },
  { id: 'chest', label: 'Chest', el: 'rect', props: { x: 72, y: 108, width: 76, height: 68, rx: 20 } },
  { id: 'abdomen', label: 'Abdomen', el: 'rect', props: { x: 76, y: 178, width: 68, height: 66, rx: 16 } },
  { id: 'pelvis', label: 'Pelvis', el: 'rect', props: { x: 78, y: 246, width: 64, height: 42, rx: 14 } },
];

const CENTER_BACK = [
  { id: 'head', label: 'Head', el: 'ellipse', props: { cx: 110, cy: 58, rx: 28, ry: 36 } },
  { id: 'neck', label: 'Neck', el: 'rect', props: { x: 100, y: 93, width: 20, height: 16, rx: 6 } },
  { id: 'upper_back', label: 'Upper back', el: 'rect', props: { x: 72, y: 108, width: 76, height: 68, rx: 20 } },
  { id: 'lower_back', label: 'Lower back', el: 'rect', props: { x: 76, y: 178, width: 68, height: 66, rx: 16 } },
  { id: 'glutes', label: 'Hips and glutes', el: 'rect', props: { x: 78, y: 246, width: 64, height: 42, rx: 14 } },
];

/** Rendered twice: once as drawn (screen-left) and once mirrored (screen-right). */
const LIMB_SHAPES = [
  { id: 'shoulder', label: 'Shoulder', el: 'rect', props: { x: 54, y: 106, width: 22, height: 24, rx: 11 } },
  { id: 'upper_arm', label: 'Upper arm', el: 'rect', props: { x: 44, y: 128, width: 20, height: 62, rx: 10 } },
  { id: 'forearm', label: 'Forearm', el: 'rect', props: { x: 41, y: 190, width: 18, height: 58, rx: 9 } },
  { id: 'hand', label: 'Hand', el: 'rect', props: { x: 40, y: 248, width: 20, height: 26, rx: 10 } },
  { id: 'thigh', label: 'Thigh', el: 'rect', props: { x: 84, y: 288, width: 26, height: 76, rx: 13 } },
  { id: 'shin', label: 'Lower leg', el: 'rect', props: { x: 86, y: 364, width: 22, height: 70, rx: 11 } },
  { id: 'foot', label: 'Foot', el: 'rect', props: { x: 83, y: 434, width: 32, height: 16, rx: 8 } },
];

function Shape({ shape, selected, onSelect }) {
  const shared = {
    fill: selected ? 'rgba(212,175,55,0.32)' : 'rgba(255,255,255,0.05)',
    stroke: selected ? GOLD : 'rgba(212,175,55,0.42)',
    strokeWidth: selected ? 2 : 1.2,
    style: { cursor: 'pointer', transition: 'fill 140ms ease, stroke 140ms ease' },
    onClick: () => onSelect(shape.id),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(shape.id);
      }
    },
    tabIndex: 0,
    role: 'button',
    'aria-label': shape.label,
    'aria-pressed': selected,
  };

  if (shape.el === 'ellipse') return <ellipse {...shape.props} {...shared} />;
  return <rect {...shape.props} {...shared} />;
}

export default function BodyMap({ view = 'front', value = [], onChange, disabled = false }) {
  const center = view === 'front' ? CENTER_FRONT : CENTER_BACK;

  // Screen-left is the traveller's RIGHT when they face us, and their LEFT when
  // they turn around. Getting this backwards would put every limb on the wrong
  // side of the body.
  const drawnSide = view === 'front' ? 'right' : 'left';
  const mirroredSide = view === 'front' ? 'left' : 'right';

  const toggle = (id) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((existing) => existing !== id) : [...value, id]);
  };

  const limbRegions = (structure, side) => structure.map((shape) => ({
    ...shape,
    id: `${shape.id}_${side}`,
    label: `${shape.label} (${side})`,
  }));

  return (
    <svg
      viewBox="0 0 220 470"
      role="group"
      aria-label={`Body map, ${view} view`}
      style={{ width: '100%', maxWidth: 250, height: 'auto', display: 'block', margin: '0 auto' }}
    >
      {center.map((shape) => (
        <Shape key={shape.id} shape={shape} selected={value.includes(shape.id)} onSelect={toggle} />
      ))}

      <g>
        {limbRegions(LIMB_SHAPES, drawnSide).map((shape) => (
          <Shape key={shape.id} shape={shape} selected={value.includes(shape.id)} onSelect={toggle} />
        ))}
      </g>

      <g transform="translate(220,0) scale(-1,1)">
        {limbRegions(LIMB_SHAPES, mirroredSide).map((shape) => (
          <Shape key={shape.id} shape={shape} selected={value.includes(shape.id)} onSelect={toggle} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Every region of a view as a flat list — the reliable way to name a place
 * when tapping a shape is not precise enough (a wrist, the back of the knee).
 */
export function regionsForView(view) {
  const center = (view === 'front' ? CENTER_FRONT : CENTER_BACK).map((shape) => ({ ...shape }));
  const drawnSide = view === 'front' ? 'right' : 'left';
  const mirroredSide = view === 'front' ? 'left' : 'right';
  const limbs = (side) => LIMB_SHAPES.map((shape) => ({
    ...shape,
    id: `${shape.id}_${side}`,
    label: `${shape.label} (${side})`,
  }));
  return [...center, ...limbs(drawnSide), ...limbs(mirroredSide)];
}