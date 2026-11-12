import type { RefObject } from 'react';

/** Các phần tử của lớp chuyển cảnh mà hook chuyển cảnh điều khiển trực tiếp. */
export interface StageRefs {
  loginRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  coverRef: RefObject<HTMLDivElement | null>;
  logoRef: RefObject<HTMLImageElement | null>;
  nameRef: RefObject<HTMLDivElement | null>;
  dotsRef: RefObject<HTMLDivElement | null>;
}
