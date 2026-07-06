import { styled } from '../utils/styled.ts';
import { StyledProps} from '../types.ts';
import React, { useMemo } from 'react';

type TileProps = {
  children: React.ReactNode | React.ReactNode[];
  deactivated?: boolean;
  variant?: 'default' | 'error' | 'edit' | 'secondary' | 'outlined';
};

type StyledTileProps = {
  isDeactivated: boolean;
  variant: TileProps['variant'];
};

const StyledTile = styled('div')<StyledProps<StyledTileProps>>(
  ({ styledProps: { isDeactivated, variant }, theme }) => `
  border-radius: 2px;
  overflow: auto;
  transition: background-color 300ms linear;
  background-color: white;
  border: 1px solid #000000;
  box-shadow: ${!isDeactivated && variant !== 'outlined' ? '1px 2px 4px 2px rgba(0, 0, 0, 0.30)' : 'none'};
`,
);

const StyledDeactivatedContainer = styled('div')<StyledProps<StyledTileProps>>(
  ({ styledProps: { isDeactivated } }) => `
  opacity: ${isDeactivated ? 0.5 : 1};
`,
);

const StyledActionsContainer = styled('div')`
  display: flex;
`;

/**
 * The tile essentially defines a block of data that are to be grouped in order
 * to show a single source of informations.
 * It is mandatory to pass a children that has to be a composed by TileTitle and
 * TileContent
 * The children property can be a Node or an array of Nodes
 *
 * Related to this:
 * https://reviewpro.atlassian.net/wiki/spaces/EN/pages/607584257/Tile+component
 */
const Tile = ({
  children: inputChildren,
  deactivated = false,
  variant = 'default',
}: TileProps) => {
  const children = useMemo(() => {
    const actions: React.ReactNode[] = [];
    const rest: React.ReactNode[] = [];
    React.Children.toArray(inputChildren).forEach((child) => {
      rest.push(child);
    });
    return {
      actions,
      rest,
    };
  }, [inputChildren]);

  return (
    <StyledTile
      styledProps={{
        isDeactivated: !!deactivated,
        variant: variant,
      }}
    >
      <StyledDeactivatedContainer
        styledProps={{ isDeactivated: !!deactivated }}
      >
        {children.rest}
        <StyledActionsContainer>{children.actions}</StyledActionsContainer>
      </StyledDeactivatedContainer>
    </StyledTile>
  );
};

Tile.rpName = 'Tile';

export { Tile };

const exportComponent = Tile;

export default exportComponent;
