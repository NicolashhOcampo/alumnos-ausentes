import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

export default function PivotExcel() {
    const inputAsistenciaRef = useRef<HTMLInputElement | null>(null);
    const inputAlumnosRef = useRef<HTMLInputElement | null>(null);
    const [archivoAsistencia, setArchivoAsistencia] = useState<File | null>(null);
    const [archivoAlumnos, setArchivoAlumnos] = useState<File | null>(null);
    const [tablaPresentes, setTablaPresentes] = useState<{ [key: string]: string }[]>([]);
    const [tablaAusentes, setTablaAusentes] = useState<{ [key: string]: string }[]>([]);
    const [dias, setDias] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);

    const procesarArchivos = (asistenciasFile: File, alumnosFile: File) => {
        const readerAsistencias = new FileReader();
        const readerAlumnos = new FileReader();

        readerAlumnos.onload = (evt) => {
            if (!evt.target?.result || typeof evt.target.result === "string") return;
            const data = new Uint8Array(evt.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const alumnosData: { Alumno: string }[] = XLSX.utils.sheet_to_json(sheet);

            const listaAlumnos = alumnosData.map((a) => a.Alumno);
            if (listaAlumnos.length === 0) {
                alert("La lista de alumnos está vacía.");
                return;
            }

            if (listaAlumnos.length !== new Set(listaAlumnos).size) {
                alert("La lista de alumnos contiene nombres duplicados. Por favor, verifique que el archivo es el correcto.");
                return;
            }

            // Ahora procesamos el archivo de asistencias
            readerAsistencias.onload = (evt2) => {
                if (!evt2.target?.result || typeof evt2.target.result === "string") return;
                const data2 = new Uint8Array(evt2.target.result as ArrayBuffer);
                const workbook2 = XLSX.read(data2, { type: "array" });

                const sheetName2 = workbook2.SheetNames[0];
                const sheet2 = workbook2.Sheets[sheetName2];
                const asistenciasData: { Dia: string | number; Alumno: string }[] = XLSX.utils.sheet_to_json(sheet2);


                // Conversión de fechas
                const diasConvertidos = asistenciasData.map((row) => {
                    if (typeof row.Dia === "number") {
                        const fecha = XLSX.SSF.parse_date_code(row.Dia);
                        return `${String(fecha.d).padStart(2, "0")}/${String(fecha.m).padStart(2, "0")}/${fecha.y}`;
                    }
                    return row.Dia;
                });
                asistenciasData.forEach((row, i) => (row.Dia = diasConvertidos[i]));

                const diasUnicos = [...new Set(diasConvertidos)];

                // Armar presentes y ausentes por día
                const presentesTabla: { [key: string]: string }[] = [];
                const ausentesTabla: { [key: string]: string }[] = [];

                const maxPresentes = Math.max(
                    ...diasUnicos.map(
                        (dia) => asistenciasData.filter((row) => row.Dia === dia).length
                    )
                );

                const maxAusentes = listaAlumnos.length;

                for (let i = 0; i < maxPresentes; i++) {
                    const fila: { [key: string]: string } = {};
                    diasUnicos.forEach((dia) => {
                        const presentes = asistenciasData
                            .filter((row) => row.Dia === dia)
                            .map((r) => r.Alumno);
                        fila[dia] = presentes[i] || "";
                    });
                    presentesTabla.push(fila);
                }

                for (let i = 0; i < maxAusentes; i++) {
                    const fila: { [key: string]: string } = {};
                    diasUnicos.forEach((dia) => {
                        const presentes = asistenciasData
                            .filter((row) => row.Dia === dia)
                            .map((r) => r.Alumno);
                        const ausentes = listaAlumnos.filter((alumno) => !presentes.includes(alumno));
                        fila[dia] = ausentes[i] || "";
                    });
                    ausentesTabla.push(fila);
                }

                setDias(diasUnicos);
                setTablaPresentes(presentesTabla);
                setTablaAusentes(ausentesTabla.filter(fila => Object.values(fila).some(val => val !== "")));
            };

            readerAsistencias.readAsArrayBuffer(asistenciasFile);
        };

        readerAlumnos.readAsArrayBuffer(alumnosFile);
    };


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleGenerateReport = () => {
        if (archivoAsistencia && archivoAlumnos) {
            procesarArchivos(archivoAsistencia, archivoAlumnos);
        }
    }

    return (
        <div className="p-4">
            <div className="flex justify-center gap-2">
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">Subir Excel de Asistencias</h2>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${dragOver ? "bg-blue-100 border-blue-400" : "border-gray-400"}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => handleDrop(e, setArchivoAsistencia)}
                        onClick={() => inputAsistenciaRef.current?.click()}
                    >
                        {dragOver
                            ? "📂 Soltá el archivo aquí"
                            : "Arrastrá y soltá tu archivo Excel o hacé click para seleccionar"}
                        <input
                            ref={inputAsistenciaRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setArchivoAsistencia)}
                        />
                    </div>
                    {archivoAsistencia && <p className="mt-2 text-green-600">Archivo seleccionado: {archivoAsistencia.name}</p>}
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">Subir Excel con la lista de alumnos</h2>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${dragOver ? "bg-blue-100 border-blue-400" : "border-gray-400"
                            }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => handleDrop(e, setArchivoAlumnos)}
                        onClick={() => inputAlumnosRef.current?.click()}
                    >
                        {dragOver
                            ? "📂 Soltá el archivo aquí"
                            : "Arrastrá y soltá tu archivo Excel o hacé click para seleccionar"}
                        <input
                            ref={inputAlumnosRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setArchivoAlumnos)}
                        />
                    </div>
                    {archivoAlumnos && <p className="mt-2 text-green-600">Archivo seleccionado: {archivoAlumnos.name}</p>}
                </div>
            </div>

            <div className="flex justify-center mt-4">
                <button onClick={handleGenerateReport} className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer disabled:bg-gray-400 disabled:cursor-default" disabled={!archivoAsistencia || !archivoAlumnos}>Generar Reporte</button>
            </div>

            <section className="mt-8 flex flex-col items-center gap-2">

                {
                    tablaAusentes.length > 0 && (
                        <>
                            <h2>Alumnos Ausentes</h2>
                            <div className="overflow-x-auto flex items-center justify-center">
                                <table className="mt-1 border-collapse border border-gray-400">
                                    <thead>
                                        <tr>
                                            {dias.map((dia) => (
                                                <th key={dia} className="border border-gray-400 px-2 py-1">
                                                    {dia}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tablaAusentes.map((fila, idx) => (
                                            <tr key={idx}>
                                                {dias.map((dia) => (
                                                    <td key={dia} className="border border-gray-400 px-2 py-1">
                                                        {fila[dia]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )
                }

                {
                    tablaPresentes.length > 0 && (
                        <>
                            <h2>Alumnos Presentes</h2>
                            <div className="overflow-x-auto flex items-center justify-center">
                                <table className="mt-1 border-collapse border border-gray-400">
                                    <thead>
                                        <tr>
                                            {dias.map((dia) => (
                                                <th key={dia} className="border border-gray-400 px-2 py-1">
                                                    {dia}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tablaPresentes.map((fila, idx) => (
                                            <tr key={idx}>
                                                {dias.map((dia) => (
                                                    <td key={dia} className="border border-gray-400 px-2 py-1">
                                                        {fila[dia]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </>
                    )
                }
            </section>

        </div >
    );
}
