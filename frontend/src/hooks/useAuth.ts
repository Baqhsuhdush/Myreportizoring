// Сам контекст и хук определены в context/AuthContext.tsx (там же, где
// AuthProvider — это нужно, чтобы избежать циклических импортов).
// Этот файл — просто удобная точка входа "src/hooks/useAuth", как и
// заявлено в структуре проекта.
export { useAuth } from "../context/AuthContext";
