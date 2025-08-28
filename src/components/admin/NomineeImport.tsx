// src/components/admin/NomineeImport.tsx
'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase-client';

interface NomineeImportProps {
  category_id: number;
  onNomineesChange: (nominees: any[]) => void;
}

const NomineeImport = ({ category_id, onNomineesChange }: NomineeImportProps) => {
  const [nomineeList, setNomineeList] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);

    if (!nomineeList) {
      setError('A lista de indicados não pode estar vazia.');
      return;
    }

    try {
      const supabase = createClient();
      const nominees = nomineeList.split('\n').map((nominee) => nominee.trim());

      // Remover duplicatas
      const uniqueNominees = [...new Set(nominees)];

      // Inserir os indicados no banco de dados
      const { data, error } = await supabase
        .from('nominees')
        .insert(uniqueNominees.map((name) => ({ name, category_id })))
        .select();

      if (error) {
        setError(error.message);
      } else {
        onNomineesChange(data);
        setNomineeList('');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-2">Importar Lista de Indicados</h3>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <textarea
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        rows={5}
        placeholder="Cole a lista de indicados, um por linha"
        value={nomineeList}
        onChange={(e) => setNomineeList(e.target.value)}
      />
      <button
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
        onClick={handleImport}
      >
        Importar
      </button>
    </div>
  );
};

export default NomineeImport;