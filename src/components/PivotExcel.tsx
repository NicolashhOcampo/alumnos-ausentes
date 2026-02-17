import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { DropDown } from "./DropDown";
import { toast } from "react-toastify";
import type { TableRow } from "../types/table";
import type { FilaAlumno, FilaAsistencia } from "../types/excelRows";
import { Table } from "./Table";

export const PivotExcel = () => {
    const attendanceInputRef = useRef<HTMLInputElement | null>(null);
    const studentsInputRef = useRef<HTMLInputElement | null>(null);

    const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
    const [studentsFile, setStudentsFile] = useState<File | null>(null);
    const [presentStudentsTable, setPresentStudentsTable] = useState<TableRow[]>([]);
    const [absentStudentsTable, setAbsentStudentsTable] = useState<TableRow[]>([]);
    const [notFoundStudentsTable, setNotFoundStudentsTable] = useState<TableRow[]>([]);
    const [days, setDays] = useState<string[]>([]);
    const [filterDays, setFilterDays] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);

    // Normalizar columnas
    const normalizeKeys = (row: any): any => {
        const normalizedRow: any = {};
        Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase();
            if (cleanKey === "legajo") {
                normalizedRow["Legajo"] = row[key];
            } else if (cleanKey === "apellido y nombre") {
                normalizedRow["Apellido y Nombre"] = String(row[key]).trim();
            } else if (cleanKey === "marca temporal") {
                normalizedRow["Marca temporal"] = row[key];
            } else {
                normalizedRow[key] = row[key];
            }
        });
        return normalizedRow;
    };

    const compactTableRows = (table: TableRow[]): TableRow[] => {
        const newTable: TableRow[] = [];
        table.forEach((row) => {
            const entries = Object.entries(row)
            const newRow: TableRow = {};
            entries.forEach(([key, value]) => {
                const emptyRow = newTable.find((r) => r[key] === undefined || r[key] === "");

                if (emptyRow) {
                    emptyRow[key] = value || "";
                }
                else {
                    newRow[key] = value || "";
                }
            })
            if (Object.values(newRow).some(val => val !== undefined && val !== "")) {
                newTable.push(newRow);
            }

        })
        return newTable;
    }

    const processFiles = (attendanceFile: File, studentsFile: File) => {
        console.log("Procesando archivos...");
        const readerAttendance = new FileReader();
        const readerStudents = new FileReader();

        readerStudents.onload = (evt) => {
            if (!evt.target?.result || typeof evt.target.result === "string") return;
            const data = new Uint8Array(evt.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const studentsDataRaw = XLSX.utils.sheet_to_json(sheet);
            const studentsData: FilaAlumno[] = studentsDataRaw.map(normalizeKeys);

            if (!studentsData[0]?.Legajo) {
                toast.error(`El archivo '${studentsFile.name}' no contiene la columna de 'Legajo'.`);
                setStudentsFile(null);
                return;
            }

            if (!studentsData[0]?.["Apellido y Nombre"]) {
                toast.error(`El archivo '${studentsFile.name}' no contiene la columna de 'Apellido y Nombre'.`);
                setStudentsFile(null);
                return;
            }

            // Id representa al legajo
            const studentIds: number[] = studentsData.map((a) => a.Legajo);
            if (studentIds.length === 0) {
                toast.error("La lista de alumnos está vacía.");
                return;
            }

            if (studentIds.length !== new Set(studentIds).size) {
                toast.error("La lista de alumnos contiene legajos duplicados.");
                return;
            }

            // Procesar asistencias
            readerAttendance.onload = (evt2) => {
                if (!evt2.target?.result || typeof evt2.target.result === "string") return;
                const data2 = new Uint8Array(evt2.target.result as ArrayBuffer);
                const workbook2 = XLSX.read(data2, { type: "array" });

                const sheetName2 = workbook2.SheetNames[0];
                const sheet2 = workbook2.Sheets[sheetName2];
                const attendanceDataRaw = XLSX.utils.sheet_to_json(sheet2);
                const attendanceData: FilaAsistencia[] = attendanceDataRaw.map(normalizeKeys);

                if (!attendanceData[0]?.Legajo) {
                    toast.error(`El archivo '${attendanceFile.name}' no contiene la columna de 'Legajo'.`);
                    setAttendanceFile(null);
                    return;
                }
                if (!attendanceData[0]?.["Marca temporal"]) {
                    toast.error(`El archivo '${attendanceFile.name}' no contiene la columna de 'Marca temporal'.`);
                    setAttendanceFile(null);
                    return;
                }
                if (!attendanceData[0]?.["Apellido y Nombre"]) {
                    toast.error(`El archivo '${attendanceFile.name}' no contiene la columna de 'Apellido y Nombre'.`);
                    setAttendanceFile(null);
                    return;
                }

                // Conversión de fechas
                const formattedAttendanceDates = attendanceData.map((row) => {
                    const date = XLSX.SSF.parse_date_code(row["Marca temporal"]);
                    return `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${date.y}`;
                });
                attendanceData.forEach((row, i) => (row["Dia"] = formattedAttendanceDates[i]));

                const uniqueDays = [...new Set(formattedAttendanceDates)];

                // Armar presentes y ausentes
                const presentStudentsTable: TableRow[] = [];
                const absentStudentsTable: TableRow[] = [];
                const notFoundStudentsTable: TableRow[] = [];

                const maxPresentCount = Math.max(
                    ...uniqueDays.map(
                        (d) => attendanceData.filter((row) => row["Dia"] === d).length
                    )
                );

                const maxAbsentCount = studentIds.length;

                for (let i = 0; i < maxPresentCount; i++) {
                    const presentStudentsRow: TableRow = Object.fromEntries(uniqueDays.map(d => [d, ""]));
                    const notFoundStudentsRow: TableRow = Object.fromEntries(uniqueDays.map(d => [d, ""]));
                    uniqueDays.forEach((d) => {
                        const presentes = attendanceData
                            .filter((row) => row["Dia"] === d)
                            .map((r) => r.Legajo);
                        const student = studentsData.find((a) => a.Legajo === presentes[i]);
                        if (student) {
                            presentStudentsRow[d] = student["Apellido y Nombre"];
                            notFoundStudentsRow[d] = "";
                        } else {
                            const alumnoAsistencia = attendanceData.find((a) => a.Legajo === presentes[i]);
                            if (alumnoAsistencia) {
                                notFoundStudentsRow[d] = `Legajo: ${presentes[i]}, Nombre: ${alumnoAsistencia["Apellido y Nombre"]}`;
                            }
                        }
                    });
                    presentStudentsTable.push(presentStudentsRow);
                    notFoundStudentsTable.push(notFoundStudentsRow);
                }

                for (let i = 0; i < maxAbsentCount; i++) {
                    const absentStudentsRow: TableRow = {};
                    uniqueDays.forEach((d) => {
                        const presentes = attendanceData
                            .filter((row) => row.Dia === d)
                            .map((r) => r.Legajo);
                        const ausentes = studentIds.filter((student) => !presentes.includes(student));
                        absentStudentsRow[d] = studentsData.find((a) => a.Legajo === ausentes[i])?.["Apellido y Nombre"] || "";
                    });
                    absentStudentsTable.push(absentStudentsRow);
                }

                setDays(uniqueDays);
                setFilterDays(uniqueDays);
                setPresentStudentsTable(compactTableRows(presentStudentsTable));
                setNotFoundStudentsTable(compactTableRows(notFoundStudentsTable));
                setAbsentStudentsTable(compactTableRows(absentStudentsTable));

                toast.success("Reporte generado correctamente");
            };

            readerAttendance.readAsArrayBuffer(attendanceFile);
        };

        readerStudents.readAsArrayBuffer(studentsFile);
    };

    const handleDownloadExcel = () => {
        if (days.length === 0) {
            toast.error("No hay datos para descargar");
            return;
        }

        const workbook = XLSX.utils.book_new();

        // Crear hoja de ausentes
        if (absentStudentsTable.length > 0) {
            const wsAbsentStudents = XLSX.utils.json_to_sheet(absentStudentsTable);
            XLSX.utils.book_append_sheet(workbook, wsAbsentStudents, "Ausentes");

            wsAbsentStudents["!cols"] = days.map((d) => ({ wch: Math.max(10, ...absentStudentsTable.map(row => row[d]?.length || 0)) }));
        }

        // Crear hoja de presentes
        if (presentStudentsTable.length > 0) {
            const wsPresentStudents = XLSX.utils.json_to_sheet(presentStudentsTable);
            XLSX.utils.book_append_sheet(workbook, wsPresentStudents, "Presentes");

            wsPresentStudents["!cols"] = days.map((d) => ({ wch: Math.max(10, ...presentStudentsTable.map(row => row[d]?.length || 0)) }));
        }

        // Crear hoja de no encontrados
        if (notFoundStudentsTable.length > 0) {
            const wsNotFoundStudents = XLSX.utils.json_to_sheet(notFoundStudentsTable);
            XLSX.utils.book_append_sheet(workbook, wsNotFoundStudents, "No Encontrados");

            wsNotFoundStudents["!cols"] = days.map((d) => ({ wch: Math.max(10, ...notFoundStudentsTable.map(row => row[d]?.length || 0)) }));
        }

        // Descargar el archivo
        XLSX.writeFile(workbook, `Reporte_Asistencias_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
        toast.success("Archivo descargado correctamente");
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
                toast.error("Por favor, subí un archivo Excel válido (.xlsx o .xls).");
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
                toast.error("Por favor, subí un archivo Excel válido (.xlsx o .xls).");
                return;
            }
            console.log("Archivo soltado:")
            setFile(e.dataTransfer.files[0]);
            studentsInputRef.current!.value = "";
            attendanceInputRef.current!.value = "";
            e.dataTransfer.clearData();
        }
    };

    const handleGenerateReport = () => {
        if (attendanceFile && studentsFile) {
            processFiles(attendanceFile, studentsFile);
        }
    }

    const handleSubmitFilterDays = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setFilterDays(formData.getAll("days") as string[]);
    }

    return (
        <div className="w-full max-w-7xl m-auto p-4">
            <div className="flex justify-center md:gap-2 md:flex-row flex-col gap-8">
                <div className="flex-1">
                    <h2 className="text-xl text-center font-bold mb-4">Subir Excel de Asistencias</h2>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${dragOver ? "bg-blue-100 border-blue-400" : "border-gray-400"}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => handleDrop(e, setAttendanceFile)}
                        onClick={() => attendanceInputRef.current?.click()}
                    >
                        {dragOver
                            ? "📂 Soltá el archivo aquí"
                            : "Arrastrá y soltá tu archivo Excel o hacé click para seleccionar"}
                        <input
                            ref={attendanceInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setAttendanceFile)}
                        />
                    </div>
                    {attendanceFile && <p className="mt-2 text-green-600">Archivo seleccionado: {attendanceFile.name}</p>}
                    <p className="mt-2 text-gray-600 text-center">Formato esperado:</p>
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
                    <h2 className="text-xl text-center font-bold mb-4">Subir Excel con la Lista de alumnos</h2>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${dragOver ? "bg-blue-100 border-blue-400" : "border-gray-400"}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => handleDrop(e, setStudentsFile)}
                        onClick={() => studentsInputRef.current?.click()}
                    >
                        {dragOver
                            ? "📂 Soltá el archivo aquí"
                            : "Arrastrá y soltá tu archivo Excel o hacé click para seleccionar"}
                        <input
                            ref={studentsInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setStudentsFile)}
                        />
                    </div>
                    {studentsFile && <p className="mt-2 text-green-600">Archivo seleccionado: {studentsFile.name}</p>}
                    <p className="mt-2 text-gray-600 text-center">Formato esperado:</p>
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

            <div className="flex justify-center mt-4 gap-2">
                <button onClick={handleGenerateReport} className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer disabled:bg-gray-400 disabled:cursor-default" disabled={!attendanceFile || !studentsFile}>Generar Reporte</button>
                <button onClick={handleDownloadExcel} className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer disabled:bg-gray-400 disabled:cursor-default" disabled={days.length === 0}>Descargar Excel</button>
            </div>
            <div className="w-40">
                <DropDown title="Filtro">
                    <form onSubmit={handleSubmitFilterDays} className="flex flex-col items-center">
                        {days.map((day) => (
                            <div key={day}>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="days"
                                        value={day}
                                        defaultChecked
                                    />
                                    {day}
                                </label>
                            </div>
                        ))}
                        <button className="p-2 rounded-2xl bg-green-400 m-auto mt-2 cursor-pointer">Aplicar</button>
                    </form>
                </DropDown>
            </div>
            <section className="mt-8 flex flex-col items-center gap-2">
                <DropDown title="Alumnos Ausentes">
                    {absentStudentsTable.length > 0 && <Table data={absentStudentsTable} columns={filterDays} />}
                </DropDown>

                <DropDown title="Alumnos Presentes">
                    {presentStudentsTable.length > 0 && <Table data={presentStudentsTable} columns={filterDays} />}
                </DropDown>

                <DropDown title="Legajos no encontrados en la lista de alumnos">
                    {notFoundStudentsTable.length > 0 && <Table data={notFoundStudentsTable} columns={filterDays} />}
                </DropDown>
            </section>

        </div >
    );
}
