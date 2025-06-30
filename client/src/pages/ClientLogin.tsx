import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Building2, Lock } from "lucide-react";

const clientLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type ClientLoginForm = z.infer<typeof clientLoginSchema>;

export default function ClientLogin() {
  const { toast } = useToast();
  const [showCredentials, setShowCredentials] = useState(false);

  const form = useForm<ClientLoginForm>({
    resolver: zodResolver(clientLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: ClientLoginForm) => {
      const response = await apiRequest("/api/client/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.client.name}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Redirect will be handled by the App component
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientLoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Client Portal Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your logistics dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your client credentials to access your orders and shipping information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field} 
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          {...field}
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  <Lock className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>

            {/* Demo Credentials */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full"
              >
                {showCredentials ? "Hide" : "Show"} Demo Credentials
              </Button>
              
              {showCredentials && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
                  <h4 className="font-medium text-blue-900 mb-2">Demo Client Accounts:</h4>
                  <div className="space-y-2 text-blue-800">
                    <div>
                      <strong>American Distributors LLC:</strong><br />
                      Username: american_dist<br />
                      Password: password123
                    </div>
                    <div>
                      <strong>Midwest Supply Co:</strong><br />
                      Username: midwest_supply<br />
                      Password: password123
                    </div>
                    <div>
                      <strong>Great Lakes Logistics:</strong><br />
                      Username: greatlakes_logistics<br />
                      Password: password123
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help accessing your account?{" "}
            <a href="mailto:support@logitrack.com" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}