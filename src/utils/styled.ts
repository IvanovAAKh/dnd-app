import originalStyled from '@mui/material/styles/styled';
import { rootShouldForwardProp } from '@mui/material/styles/styled';

export { css } from '@mui/material/styles';

export { rootShouldForwardProp };

export const shouldForwardProp =
  (extra?: (prop: string) => boolean): ((prop: string) => boolean) =>
    (prop: string): boolean =>
      rootShouldForwardProp(prop) &&
      prop !== 'styledProps' &&
      (extra ? extra(prop) : true);

export const styled: typeof originalStyled = (
  ...p: Parameters<typeof originalStyled>
) => {
  const [component, options = {}] = p;
  const styledFn = originalStyled(component, {
    ...options,
    shouldForwardProp: shouldForwardProp(options?.shouldForwardProp),
  });

  return styledFn;
};


export default styled;