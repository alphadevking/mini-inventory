import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
