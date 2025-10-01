export interface FilaAlumno {
    Legajo: number;
    "Apellido y Nombre": string;
}

export interface FilaAsistencia {
    "Marca temporal": number;
    "Dia": string;
    "Apellido y Nombre": string;
    Legajo: number;
}