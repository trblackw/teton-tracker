import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useOrgRoutePath } from '../lib/hooks';

function NotFoundPage() {
  const navigate = useNavigate();
  const orgPath = useOrgRoutePath();

  return (
    <div className="min-h-full flex items-start justify-center bg-background pt-16 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground">
              404
            </span>
          </div>
          <CardTitle className="text-2xl font-bold">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 flex justify-center items-center">
          <Button
            variant="link"
            onClick={() => navigate({ to: orgPath('/runs') })}
            className="text-highlight hover:text-highlight/80 underline"
          >
            Go to Runs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
});
