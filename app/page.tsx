"use client";

import { Button, Select, SelectItem } from "@nextui-org/react";
import { useRef, useState } from "react";

function CSVToArray(strData: string, strDelimiter: string = ";"): string[][] {
	const objPattern = new RegExp(
		// Delimiters.
		"(\\" +
			strDelimiter +
			"|\\r?\\n|\\r|^)" +
			// Quoted fields.
			'(?:"([^"]*(?:""[^"]*)*)"|' +
			// Standard fields.
			'([^"\\' +
			strDelimiter +
			"\\r\\n]*))",
		"gi"
	);

	const arrData: string[][] = [[]];
	let arrMatches = null;

	while ((arrMatches = objPattern.exec(strData))) {
		const strMatchedDelimiter = arrMatches[1];

		if (
			strMatchedDelimiter.length &&
			strMatchedDelimiter !== strDelimiter
		) {
			arrData.push([]);
		}

		let strMatchedValue;

		if (arrMatches[2]) {
			strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
		} else {
			strMatchedValue = arrMatches[3];
		}

		arrData[arrData.length - 1].push(strMatchedValue);
	}

	return arrData.filter((row) => row.join("").length > 0);
}

function arrayToCSV(arrData: any[][], strDelimiter: string = ";") {
	let strData = "";

	for (let i = 0; i < arrData.length; i++) {
		console.log({ arrData });
		let row = arrData[i].join(strDelimiter);
		strData += row + "\r\n";
	}

	return strData;
}

function readFiles(inputFiles: FileList): Promise<string[]> {
	const filePromises: Promise<string>[] = [];

	for (let i = 0; i < inputFiles.length; i++) {
		const file = inputFiles[i];
		const filePromise = new Promise<string>((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (event) => {
				const content = event.target?.result as string;
				resolve(content);
			};

			reader.onerror = (event) => {
				reject(new Error(`Error reading file: ${file.name}`));
			};

			reader.readAsText(file);
		});

		filePromises.push(filePromise);
	}

	return Promise.all(filePromises);
}

type Action = {
	name: string;
	labels: string[];
	func: () => void;
};

export default function Home() {
	const [files, setFiles] = useState<any>(null);
	const [input, setInput] = useState<any>(null);
	const [output, setOutput] = useState<any>(null);
	const [action, setAction] = useState<any>(null);
	const [error, setError] = useState<any>();
	const [labelChoices, setLabelChoices] = useState<any>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const actions: Action[] = [
		{
			name: "Filter MSANs",
			labels: ["Database", "MSANs"],
			func: () => {
				const final = [["ND", "MSAN", "Port", "Port", "Port"]];
				const database = input[labelChoices[0]];
				const msans = input[labelChoices[1]];
				console.log({ database, msans });
				const msansSet = new Set(
					msans.slice(1).map((msan: any) => msan[0])
				);
				console.log({ msansSet });
				database.forEach((row: any) => {
					const joined = row.join("");
					if (joined.length > 0) {
						const msan = row[1].split(":")[0];
						if (msansSet.has(msan)) {
							const nd = row[0];
							const port = row[1]
								.split(":")[1]
								.split("-")
								.slice(1);
							final.push([nd, msan, ...port]);
						}
					}
				});
				setOutput([final]);
			},
		},
		{
			name: "Extraction",
			labels: ["HW", "NOKIA", "ZTE", "ZTE2", "OUTPUT"],
			func: () => {
				const HW = input[labelChoices[0]];
				const NOKIA = input[labelChoices[1]];
				const ZTE = input[labelChoices[2]];
				const ZTE2 = input[labelChoices[3]];
				const OUTPUT = input[labelChoices[4]];
				const finalOutput = [] as string[][];

				OUTPUT.forEach((ogRow: any) => {
					const number = ogRow[0];
					const ogRowJoined = ogRow.slice(1).join("");
					const current = [...ogRow];
					if (number.length > 0) {
						const HWRows = HW?.filter(
							(row: any) => {
								return row[2]?.includes(number)
							}
						).forEach((row: any) => {
							const port = row[1].split("/").map((port: string) => 
								port.replace(/Frame:|Slot:|Port:/g, "")
							);
							const final = [row[0], ...port];
							current.push(...final);
							current.push(final.join("") === ogRowJoined ? "OK" : "NOK");
						});
						const NOKIARows = NOKIA?.filter(
							(row: any) => row[4]?.includes(number)
						).forEach((row: any) => {
							const msan = row[0].split(":")[0];
							const port = row[0].split(":")[1].split(".").slice(1).map((port: string) =>
								port.replace(/R|S|P|LT/g, "")
							);
							const final = [msan, ...port];
							current.push(...final);
							current.push(final.join("") === ogRowJoined ? "OK" : "NOK");
						});
						const ZTERows = ZTE?.filter(
							(row: any) => row[19]?.includes(number) && row[24] == "1"
						).forEach((row: any) => {
							const msan = row[1];
							const port = [row[11], row[12], row[13]]
							const final = [msan, ...port];
							current.push(...final);
							current.push(final.join("") === ogRowJoined ? "OK" : "NOK");
						});
						const ZTE2Rows = ZTE2?.filter(
							(row: any) => row[19]?.includes(number) && row[24] == "1"
						).forEach((row: any) => {
							const msan = row[1];
							const port = [row[11], row[12], row[13]]
							const final = [msan, ...port];
							current.push(...final);
							current.push(final.join("") === ogRowJoined ? "OK" : "NOK");
						});

						finalOutput.push(current);
					}
				});

				console.log({ finalOutput });
				setOutput([finalOutput]);
			},
		}
	];

	const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) {
			setAction(null);
			setLabelChoices([]);
			setOutput(null);
			return;
		}
		setFiles(Array.from(files));
		readFiles(files)
			.then((contents) => {
				const finalInput = [];
				for (const content of contents) {
					const rows = CSVToArray(content);
					finalInput.push(rows);
				}
				console.log({ finalInput });
				setInput(finalInput);
				setLabelChoices([]);
			})
			.catch((error) => {
				console.error(error);
			});
	};

	const handleDownload = () => {
		if (output) {
			for (let i = 0; i < output.length; i++) {
				const csv = output[i];
				const csvData = arrayToCSV(csv);
				const csvBlob = new Blob([csvData], { type: "text/csv" });
				const csvUrl = URL.createObjectURL(csvBlob);
				const link = document.createElement("a");
				link.href = csvUrl;
				link.download = `output-${i}.csv`;
				link.click();
			}
		}
	};

	const handleActionChange = (e: any) => {
		const action = e.target.value;
		setAction(action === "" ? null : action);
		setLabelChoices([]);
		setOutput(null);
	};

	const handleLabelChange = (e: any, index: number) => {
		const label = e.target.value;
		setLabelChoices((prev: any) => {
			const next = [...prev];
			next[index] = label === "" ? null : label;
			return next;
		});
		setOutput(null);
	}
	
	return (
		<main className="flex justify-center items-center flex-col gap-4 min-h-screen">
			<div className="w-96 flex flex-col gap-2">
				<input
					ref={inputRef}
					type="file"
					accept=".csv"
					onChange={handleUpload}
					className="hidden"
					multiple
				/>
				<Button onClick={() => inputRef.current?.click()}>
					Upload
				</Button>
				{files?.map((file: any, index: number) => {
					return (
						<div key={index}>
							{file.name} - {file.size} bytes
						</div>
					);
				})}
				<Select
					isDisabled={!input || input.length === 0}
					placeholder="Select an action"
					selectedKeys={action ? [action] : []}
					onChange={handleActionChange}
				>
					{actions.map((action, index) => {
						return (
							<SelectItem key={index}>{action.name}</SelectItem>
						);
					})}
				</Select>

				{action != null &&
					actions[action].labels.map(
						(label: string, index: number) => {
							return (
								<Select
									key={index}
									placeholder={`Select ${label}`}
									selectedKeys={
										labelChoices[index]
											? [labelChoices[index]]
											: []
									}
									onChange={(e) => handleLabelChange(e, index)}
								>
									{files.map((file: any, index: number) => {
										return (
											<SelectItem key={index}>
												{file.name}
											</SelectItem>
										);
									})}
								</Select>
							);
						}
					)}
				<div className="flex gap-2">
					<Button
						isDisabled={
							action == null ||
							!labelChoices?.some((choice: any) => choice != null)
						}
						className="flex-1"
						onClick={() => {
							try {
								actions[action].func();
								setError(null);
							} catch (error) {
								console.error(error);
								setError("Error");
							}
						}}
					>
						Action
					</Button>
					<Button
						isDisabled={!output || output.length === 0}
						className="flex-1"
						onClick={handleDownload}
					>
						Download
					</Button>
				</div>
				<div className="text-red-500">{error && error}</div>
			</div>
		</main>
	);
}
