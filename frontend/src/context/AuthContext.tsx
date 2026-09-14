import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LoginFormData, RegisterFormData, User } from "../types";
import {
  ApiRequestError,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "../api/auth";

// ---------------------------------------------------------------------------
// Контекст авторизации: текущий пользователь + действия (login/register/logout)
// ---------------------------------------------------------------------------
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (form: LoginFormData) => Promise<{ pendingApproval: boolean }>;
  register: (form: RegisterFormData) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: currentUser } = await fetchMe();
      setUser(currentUser);
    } catch (error) {
      // 401 — нормальная ситуация для неавторизованного пользователя
      if (!(error instanceof ApiRequestError) || error.status !== 401) {
        console.error("Не удалось получить текущего пользователя", error);
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refresh();
      setIsLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (form: LoginFormData) => {
    const response = await apiLogin(form);
    // Пока заявка не подтверждена, храним пользователя, но UI должен
    // показывать экран ожидания (см. response.pendingApproval)
    setUser(response.user);
    return { pendingApproval: response.pendingApproval };
  }, []);

  const register = useCallback(async (form: RegisterFormData) => {
    const response = await apiRegister(form);
    return { message: response.message };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  }
  return context;
}
