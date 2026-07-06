export type Position = {
  x: number;
  y: number;
};

export type Size = {
  height: number;
  width: number;
};

export type Bounds = {
  position: Position;
  size: Size;
};

type RestrictedStyleProps = 'className' | 'style' | 'sx' | 'classes';

export type StyledProps<T, K extends keyof T = never> = {
  styledProps: Partial<T> & {
    [P in K]-?: NonNullable<T[P]>;
  };
};

export type Item = {
  id: string;
  position: Position;
  size: Size;
};

export type Container = {
  id: string;
  items: Item[];
  position: Position;
  size: Size;
  title: string;
};