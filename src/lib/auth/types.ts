export type Rol = "admin" | "mostrador";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
}
