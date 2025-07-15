import { useAuth } from '@clerk/clerk-react';
import { Link } from '@tanstack/react-router';
import { LogOut, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '../lib/user-utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function UserProfilePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const { user, fullName, email, imageUrl } = useCurrentUser();

  if (!user) {
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

  const handleSettingsClick = () => {
    setIsOpen(false); // Close popover when navigating to settings
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-8 px-2"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={fullName || 'User'}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
          <span className="hidden md:block text-sm font-medium truncate">
            {fullName || email || 'User'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={fullName || 'User'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {fullName || 'User'}
              </p>
              {email && (
                <p className="text-xs text-muted-foreground truncate">
                  {email}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-1">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-sm"
          >
            <Link
              to="/settings"
              className="flex items-center gap-2"
              onClick={handleSettingsClick}
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
