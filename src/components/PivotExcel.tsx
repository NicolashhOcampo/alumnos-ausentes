import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

interface FilaAlumno {
    Legajo: number;
    "Apellido y Nombre": string;
}

interface FilaAsistencia {
    "Marca temporal": number;
    "Dia": string;
    "Apellido y Nombre": string;
    Legajo: number;
}

interface FilaTabla {
    [key: string]: string;
}


export const PivotExcel = () => {
    const inputAsistenciaRef = useRef<HTMLInputElement | null>(null);
    const inputAlumnosRef = useRef<HTMLInputElement | null>(null);
    const [archivoAsistencia, setArchivoAsistencia] = useState<File | null>(null);
    const [archivoAlumnos, setArchivoAlumnos] = useState<File | null>(null);
    const [tablaPresentes, setTablaPresentes] = useState<FilaTabla[]>([]);
    const [tablaAusentes, setTablaAusentes] = useState<FilaTabla[]>([]);
    const [tablaAlumnosNoEncontrados, setTablaAlumnosNoEncontrados] = useState<FilaTabla[]>([]);
    const [dias, setDias] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);

    // 🔑 Normalizar columnas
    const normalizeKeys = (row: any): any => {
        const normalizedRow: any = {};
        Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase();
            if (cleanKey === "legajo") {
                normalizedRow["Legajo"] = row[key];
            } else if (cleanKey === "apellido y nombre") {
                normalizedRow["Apellido y Nombre"] = row[key];
            } else if (cleanKey === "apellido" || cleanKey === "nombre y apellido") {
                // opcional: más tolerancia
                normalizedRow["Apellido y Nombre"] = row[key];
            } else if (cleanKey === "marca temporal") {
                normalizedRow["Marca temporal"] = row[key];
            } else {
                normalizedRow[key] = row[key];
            }
        });
        return normalizedRow;
    };

    const procesarArchivos = (asistenciasFile: File, alumnosFile: File) => {
        console.log("Procesando archivos...");
        const readerAsistencias = new FileReader();
        const readerAlumnos = new FileReader();

        readerAlumnos.onload = (evt) => {
            if (!evt.target?.result || typeof evt.target.result === "string") return;
            const data = new Uint8Array(evt.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const alumnosDataRaw = XLSX.utils.sheet_to_json(sheet);
            const alumnosData: FilaAlumno[] = alumnosDataRaw.map(normalizeKeys);

            if (!alumnosData[0]?.Legajo) {
                alert(`El archivo ${alumnosFile.name} no contiene la columna de 'Legajo'.`);
                setArchivoAlumnos(null);
                return;
            }

            if (!alumnosData[0]?.["Apellido y Nombre"]) {
                alert(`El archivo ${alumnosFile.name} no contiene la columna de 'Apellido y Nombre'.`);
                setArchivoAlumnos(null);
                return;
            }

            const listaLegajosAlumno = alumnosData.map((a) => a.Legajo);
            if (listaLegajosAlumno.length === 0) {
                alert("La lista de alumnos está vacía.");
                return;
            }

            if (listaLegajosAlumno.length !== new Set(listaLegajosAlumno).size) {
                alert("La lista de alumnos contiene legajos duplicados.");
                return;
            }

            // Procesar asistencias
            readerAsistencias.onload = (evt2) => {
                if (!evt2.target?.result || typeof evt2.target.result === "string") return;
                const data2 = new Uint8Array(evt2.target.result as ArrayBuffer);
                const workbook2 = XLSX.read(data2, { type: "array" });

                const sheetName2 = workbook2.SheetNames[0];
                const sheet2 = workbook2.Sheets[sheetName2];
                const asistenciasDataRaw = XLSX.utils.sheet_to_json(sheet2);
                const asistenciasData: FilaAsistencia[] = asistenciasDataRaw.map(normalizeKeys);

                if (!asistenciasData[0]?.Legajo) {
                    alert(`El archivo ${asistenciasFile.name} no contiene la columna de 'Legajo'.`);
                    setArchivoAsistencia(null);
                    return;
                }
                if (!asistenciasData[0]?.["Marca temporal"]) {
                    alert(`El archivo ${asistenciasFile.name} no contiene la columna de 'Marca temporal'.`);
                    setArchivoAsistencia(null);
                    return;
                }
                if (!asistenciasData[0]?.["Apellido y Nombre"]) {
                    alert(`El archivo ${asistenciasFile.name} no contiene la columna de 'Apellido y Nombre'.`);
                    setArchivoAsistencia(null);
                    return;
                }

                // Conversión de fechas
                const diasConvertidos = asistenciasData.map((row) => {
                    const fecha = XLSX.SSF.parse_date_code(row["Marca temporal"]);
                    return `${String(fecha.d).padStart(2, "0")}/${String(fecha.m).padStart(2, "0")}/${fecha.y}`;
                });
                asistenciasData.forEach((row, i) => (row["Dia"] = diasConvertidos[i]));

                const diasUnicos = [...new Set(diasConvertidos)];

                // Armar presentes y ausentes
                const presentesTabla: FilaTabla[] = [];
                const ausentesTabla: FilaTabla[] = [];
                const noEncontradosTabla: FilaTabla[] = [];

                const maxPresentes = Math.max(
                    ...diasUnicos.map(
                        (dia) => asistenciasData.filter((row) => row["Dia"] === dia).length
                    )
                );

                const maxAusentes = listaLegajosAlumno.length;

                for (let i = 0; i < maxPresentes; i++) {
                    const filaPresentes: FilaTabla = {};
                    const filaNoEncontrados: FilaTabla = {};
                    diasUnicos.forEach((dia) => {
                        const presentes = asistenciasData
                            .filter((row) => row["Dia"] === dia)
                            .map((r) => r.Legajo);
                        const alumno = alumnosData.find((a) => a.Legajo === presentes[i]);
                        if (alumno) {
                            filaPresentes[dia] = alumno["Apellido y Nombre"] || String(presentes[i]);
                        } else {
                            const alumnoAsistencia = asistenciasData.find((a) => a.Legajo === presentes[i]);
                            if (alumnoAsistencia) {
                                filaNoEncontrados[dia] = `Legajo: ${presentes[i]}, Nombre: ${alumnoAsistencia["Apellido y Nombre"]}`;
                            }
                        }
                    });
                    presentesTabla.push(filaPresentes);
                    noEncontradosTabla.push(filaNoEncontrados);
                }

                for (let i = 0; i < maxAusentes; i++) {
                    const fila: FilaTabla = {};
                    diasUnicos.forEach((dia) => {
                        const presentes = asistenciasData
                            .filter((row) => row.Dia === dia)
                            .map((r) => r.Legajo);
                        const ausentes = listaLegajosAlumno.filter((alumno) => !presentes.includes(alumno));
                        fila[dia] = alumnosData.find((a) => a.Legajo === ausentes[i])?.["Apellido y Nombre"] || "";
                    });
                    ausentesTabla.push(fila);
                }

                setDias(diasUnicos);
                setTablaPresentes(presentesTabla.filter(fila => Object.values(fila).some(val => val !== undefined)));
                setTablaAlumnosNoEncontrados(noEncontradosTabla.filter(fila => Object.values(fila).some(val => val !== undefined)));
                setTablaAusentes(ausentesTabla.filter(fila => Object.values(fila).some(val => val !== "")));
            };

            readerAsistencias.readAsArrayBuffer(asistenciasFile);
        };

        readerAlumnos.readAsArrayBuffer(alumnosFile);
    };

    const isExcelFile = (file: File) => {
        const validTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];
        const validExtensions = [".xlsx", ".xls"];
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        return (
            validTypes.includes(fileType) ||
            validExtensions.some(ext => fileName.endsWith(ext))
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (!isExcelFile(e.target.files[0])) {
                alert("Por favor, subí un archivo Excel válido (.xlsx o .xls).");
                return;
            }
            console.log("Subido archivo")
            setFile(e.target.files[0]);
            e.target.value = "";
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (!isExcelFile(e.dataTransfer.files[0])) {
                alert("Por favor, subí un archivo Excel válido (.xlsx o .xls).");
                return;
            }
            console.log("Archivo soltado:")
            setFile(e.dataTransfer.files[0]);
            inputAlumnosRef.current!.value = "";
            inputAsistenciaRef.current!.value = "";
            e.dataTransfer.clearData();
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
                    <p className="mt-2 text-gray-600">Formato esperado:</p>
                    <table className="m-auto mt-1 border-collapse border border-gray-400">
                        <thead>
                            <tr>
                                <th className="border border-gray-400 px-2 py-1">
                                    Marca temporal
                                </th>
                                <th className="border border-gray-400 px-2 py-1">
                                    Legajo
                                </th>
                                <th className="border border-gray-400 px-2 py-1">
                                    Apellido y Nombre
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-400 px-2 py-1">
                                    22/8/2025  18:39:27
                                </td>
                                <td className="border border-gray-400 px-2 py-1">
                                    50000
                                </td>
                                <td className="border border-gray-400 px-2 py-1">
                                    Juan Perez
                                </td>
                            </tr>
                        </tbody>
                    </table>

                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">Subir Excel con la Lista de alumnos</h2>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${dragOver ? "bg-blue-100 border-blue-400" : "border-gray-400"}`}
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
                    <p className="mt-2 text-gray-600">Formato esperado:</p>
                    <table className="m-auto mt-1 border-collapse border border-gray-400">
                        <thead>
                            <tr>
                                <th className="border border-gray-400 px-2 py-1">
                                    Legajo
                                </th>
                                <th className="border border-gray-400 px-2 py-1">
                                    Apellido y Nombre
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-400 px-2 py-1">
                                    50000
                                </td>
                                <td className="border border-gray-400 px-2 py-1">
                                    Juan Perez
                                </td>
                            </tr>
                        </tbody>
                    </table>
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

                {
                    tablaAlumnosNoEncontrados.length > 0 && (
                        <>
                            <h2>Legajos No Encontrados</h2>
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
                                        {tablaAlumnosNoEncontrados.map((fila, idx) => (
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
