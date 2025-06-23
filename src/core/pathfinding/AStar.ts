export interface AStar<NodeType> {
  compute(): PathFindResultType;
  reconstructPath(): NodeType[];
}

export enum PathFindResultType {
  NextTile,
  Pending,
  Completed,
  PathNotFound,
}
export type AStarResult<NodeType> =
  | {
      type: PathFindResultType.NextTile;
      node: NodeType;
    }
  | {
      type: PathFindResultType.Pending;
    }
  | {
      type: PathFindResultType.Completed;
      node: NodeType;
    }
  | {
      type: PathFindResultType.PathNotFound;
    };

export interface Point {
  x: number;
  y: number;
}
