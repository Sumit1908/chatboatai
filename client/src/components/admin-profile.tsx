import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

export function AdminProfilePanel() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Admin Profile</h1>
        <p className="text-sm text-muted-foreground">Your administrator account</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">
              {user?.firstName?.[0] || user?.email?.[0] || "A"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">
              {user?.firstName || user?.lastName ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim() : "Admin"}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex gap-2">
              <Badge className="bg-primary text-primary-foreground">
                {user?.role === "super_admin" ? "Super Admin" : user?.role}
              </Badge>
              {user?.createdAt && (
                <Badge variant="outline">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Need to change your password?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Go to <span className="font-medium text-foreground">Settings</span> in the sidebar — Change
            Admin Password is under Security.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
