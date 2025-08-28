// src/components/admin/NomineeList.tsx
'use client';

import React from 'react';

interface Nominee {
  id: number;
  name: string;
  category_id: number;
  imdb_id: string | null;
}

interface NomineeListProps {
  nominees: Nominee[];
  onEdit: (nominee: Nominee) => void;
  onDelete: (nominee: Nominee) => void;
}

const NomineeList = ({ nominees, onEdit, onDelete }: NomineeListProps) => {
  return (
    <div>
      <h3 className="text-xl font-bold mb-2">Lista de Indicados</h3>
      {nominees.length === 0 ? (
        <p>Nenhum indicado cadastrado.</p>
      ) : (
        <ul>
          {nominees.map((nominee) => (
            <li key={nominee.id} className="mb-2">
              {nominee.name}
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline ml-2"
                onClick={() => onEdit(nominee)}
              >
                Editar
              </button>
              <button
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline ml-2"
                onClick={() => onDelete(nominee)}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NomineeList;