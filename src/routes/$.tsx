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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground">
              404
            </span>
          </div>
          <CardTitle className="text-3xl font-bold">Page Not Found</CardTitle>
          <p className="text-muted-foreground text-lg">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved, deleted, or you entered the wrong URL.
          </p>
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
