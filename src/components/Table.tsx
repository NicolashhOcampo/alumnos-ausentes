import type { FilaTabla } from "../types/table"

export const Table = ({ data, columns }: { data: FilaTabla[], columns: string[] }) => {
    return (
        <table className="m-auto mt-1 border-collapse border border-gray-400">
            <thead>
                <tr>
                    {columns.map((col) => (
                        <th key={col} className="border border-gray-400 px-10 py-1">
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((fila, idx) => (
                    <tr key={idx}>
                        {columns.map((col) => (
                            <td key={col} className="border border-gray-400 px-2 py-1">
                                {fila[col]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
