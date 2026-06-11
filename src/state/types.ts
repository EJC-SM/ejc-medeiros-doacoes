export type Etapa = 1 | 2;

export type AuthRole = 'coordenador' | 'dirigente';

export interface ItemDoacao {
  nome: string;
  unidade: string;
  quantidade: number;
}

export interface CategoriaCatalogo {
  id: string;
  nome: string;
}

export interface ItemCatalogo {
  nome: string;
  unidade: string;
  visivel?: boolean;
  meta?: number;
  cat?: string;
}

export interface Doacao {
  id: number;
  nome: string;
  equipe: string;
  telefone?: string;
  itens: ItemDoacao[];
  data: string;
  entregue?: {
    data: string;
    ocasiao?: string;
  };
}

export interface AppState {
  etapaAtual: Etapa;
  doacoes: Record<Etapa, Doacao[]>;
}

export interface AppConfig {
  nomeEvento: string;
  versiculo: string;
  versiculoRef: string;
  pixChave: string;
  pixQr: string;
  logo: string;
  etapaLocked: 0 | Etapa;
}

export interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
