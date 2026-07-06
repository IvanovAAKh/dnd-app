import { Container, Size, Position } from '../types';

const rect = (x: number, y: number, w: number, h: number): {
  size: Size;
  position: Position;
} => {
  return {
    size: {
      height: h,
      width: w,
    },
    position: {
      x,
      y,
    },
  };
};

const containerA = {
  id: 'Container A',
  title: 'Container A',
  items: [
    {
      id: 'Item AA',
      ...rect(0, 0, 1, 20),
    },
    {
      id: 'Item AB',
      ...rect(1, 0, 2, 10),
    },
    {
      id: 'Item AC',
      ...rect(3, 0, 1, 20),
    },
  ],
  ...rect(0, 0, 4, 20),
};

const containerB = {
  id: 'Container B',
  title: 'Container B',
  items: [
    {
      id: 'Item BA',
      ...rect(0, 0, 1, 10),
    },
    {
      id: 'Item BB',
      ...rect(1, 0, 2, 5),
    },
    {
      id: 'Item BC',
      ...rect(3, 0, 1, 10),
    },
  ],
  ...rect(4, 0, 4, 10),
};

const containerC = {
  id: 'Container C',
  title: 'Container C',
  items: [
    {
      id: 'Item CA',
      ...rect(0, 0, 1, 20),
    },
    {
      id: 'Item CB',
      ...rect(1, 0, 2, 10),
    },
    {
      id: 'Item CC',
      ...rect(3, 0, 1, 20),
    },
  ],
  ...rect(8, 0, 4, 20),
};

const containerD = {
  id: 'Container D',
  title: 'Container D',
  items: [
    {
      id: 'Item DA',
      ...rect(0, 0, 1, 20),
    },
    {
      id: 'Item DB',
      ...rect(1, 0, 2, 10),
    },
    {
      id: 'Item DC',
      ...rect(3, 0, 1, 20),
    },
  ],
  ...rect(0, 24, 4, 20),
};

const containerE = {
  id: 'Container E',
  title: 'Container E',
  items: [
    {
      id: 'Item EA',
      ...rect(0, 0, 1, 20),
    },
    {
      id: 'Item EB',
      ...rect(1, 0, 2, 10),
    },
    {
      id: 'Item EC',
      ...rect(3, 0, 1, 20),
    },
  ],
  ...rect(4, 14, 4, 20),
};

const containerF = {
  id: 'Container F',
  title: 'Container F',
  items: [
    {
      id: 'Item FA',
      ...rect(0, 0, 1, 20),
    },
    {
      id: 'Item FB',
      ...rect(1, 0, 2, 10),
    },
    {
      id: 'Item FC',
      ...rect(3, 0, 1, 20),
    },
  ],
  ...rect(8, 24, 4, 20),
};

const data: Container[] = [
  containerA,
  containerB,
  containerC,
  containerD,
  containerE,
  containerF,
];

export default data;