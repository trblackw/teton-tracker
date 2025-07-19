import { useAuth } from '@clerk/clerk-react';
import { Link } from '@tanstack/react-router';
import { Building2, LogOut, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../lib/AppContextProvider';
import { useUserOrganization } from '../lib/hooks/use-organizations';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function UserProfilePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const { currentUser } = useAppContext();
  const { data: organization, isLoading: orgsLoading } = useUserOrganization();
  if (!currentUser) {
    return null;
  }

  const handleSignOut = async () => {
    setIsOpen(false); // Close popover immediately
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavClick = () => {
    setIsOpen(false); // Close popover when navigating
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-8 px-2"
        >
          {currentUser.imageUrl ? (
            <img
              src={currentUser.imageUrl}
              alt={currentUser.name || 'User'}
              className="size-7 rounded-full border border-blue-500"
            />
          ) : (
            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
          <span className="hidden md:block text-sm font-medium truncate">
            {currentUser.name || currentUser.email || 'User'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            {currentUser.imageUrl ? (
              <img
                src={currentUser.imageUrl}
                alt={currentUser.name || 'User'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser.name || 'User'}
              </p>
              {currentUser.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Organizations Section - Only show if user has an organization */}
        {organization && (
          <div className="p-3 border-b">
            {orgsLoading ? (
              <div className="text-xs text-muted-foreground">
                Loading organization...
              </div>
            ) : (
              <div className="space-y-1">
                {/* Show the single organization */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Link
                      to="/organization"
                      className="text-sm font-medium truncate text-blue-500"
                      onClick={handleNavClick}
                    >
                      {organization.name}
                    </Link>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                  {(organization as any).role.replace('org:', '')}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="p-1">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-sm"
          >
            <Link
              to="/settings"
              className="flex items-center gap-2"
              onClick={handleNavClick}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-sm"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign Out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
