import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, LoginUser, InsertUser } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    registerLoading: registerMutation.isPending,
    logoutLoading: logoutMutation.isPending,
  };
}