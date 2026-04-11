'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, Download, Upload, Loader2 } from 'lucide-react';
import { createMember } from '@/lib/api/members';
import { Member } from '@/lib/types';

interface ImportCsvModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportResult {
    success: number;
    failed: number;
    errors: { row: number; error: string }[];
}

export function ImportCsvModal({ isOpen, onClose, onSuccess }: ImportCsvModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const downloadTemplate = () => {
        const headers = ['firstName', 'lastName', 'email', 'phone', 'city', 'state', 'status'];
        const csvContent = headers.join(',') + '\nJohn,Doe,john@example.com,1234567890,Mumbai,Maharashtra,active';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'members_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const runImport = async () => {
        if (!file) return;

        setIsImporting(true);
        setResult(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as any[];
                let successCount = 0;
                let failedCount = 0;
                const errors: { row: number; error: string }[] = [];

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    try {
                        const firstName = row.firstName || row['First Name'] || row['first_name'];
                        const lastName = row.lastName || row['Last Name'] || row['last_name'];
                        const email = row.email || row['Email'] || '';
                        const phone = row.phone || row['Phone'] || '';
                        const city = row.city || row['City'] || '';
                        const state = row.state || row['State'] || '';
                        const status = (row.status || row['Status'] || 'active').toLowerCase() as Member['status'];

                        if (!firstName || !lastName) {
                            throw new Error('First Name and Last Name are required');
                        }

                        await createMember({
                            name: `${firstName} ${lastName}`.trim(),
                            firstName,
                            lastName,
                            email,
                            phone,
                            city,
                            state,
                            status: ['active', 'inactive', 'pending'].includes(status) ? status : 'active',
                            type: 'member',
                            score: 0,
                        });
                        successCount++;
                    } catch (err: any) {
                        failedCount++;
                        errors.push({ row: i + 2, error: err.message });
                    }
                }

                setResult({
                    success: successCount,
                    failed: failedCount,
                    errors,
                });
                setIsImporting(false);
                if (successCount > 0) {
                    onSuccess();
                }
            },
            error: (err) => {
                setResult({
                    success: 0,
                    failed: 1,
                    errors: [{ row: 0, error: err.message }],
                });
                setIsImporting(false);
            }
        });
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (!isImporting) {
            reset();
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Members from CSV">
            <div className="space-y-6">
                {!result && !isImporting && (
                    <>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p>Upload a CSV file containing member details. Your CSV should have the following headers:</p>
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs overflow-x-auto">
                                firstName, lastName, email, phone, city, state, status
                            </div>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-500 dark:hover:border-green-400 cursor-pointer transition-colors"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv"
                                className="hidden"
                            />
                            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                            {file ? (
                                <p className="text-gray-900 dark:text-gray-100 font-medium">{file.name}</p>
                            ) : (
                                <p className="text-gray-500">Click to select or drag and drop a CSV file</p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={downloadTemplate}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Template
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!file}
                                onClick={runImport}
                            >
                                Start Import
                            </Button>
                        </div>
                    </>
                )}

                {isImporting && (
                    <div className="py-12 text-center">
                        <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Importing members...</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please keep this window open while we process your file.</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.success}</p>
                                <p className="text-sm text-green-600 dark:text-green-500">Successfully Imported</p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
                                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.failed}</p>
                                <p className="text-sm text-red-600 dark:text-red-500">Failed</p>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-gray-500 font-medium">Row</th>
                                            <th className="px-4 py-2 text-left text-gray-500 font-medium">Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {result.errors.map((err, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-gray-500">{err.row}</td>
                                                <td className="px-4 py-2 text-red-500">{err.error}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button onClick={handleClose}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
