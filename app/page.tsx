"use client";

import {
	Button,
	Card,
	CardBody,
	CardFooter,
	CardHeader,
	Divider,
	Input,
	Select,
	SelectItem,
} from "@nextui-org/react";
import { Download } from "lucide-react";
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

const cleanNumber = (number: string) => {
	return number.replace(/^0+/, "").replace(/\D.*$/, "");
};

type Action = {
	name: string;
	labels: string[];
	desc: string;
	func: () => void;
};

function DownloadEntry({ csv, index }: { csv: any; index: number }) {
	const [name, setName] = useState<string>("");

	return (
		<div className="flex gap-2">
			<Input
				isClearable
				value={name}
				onValueChange={setName}
			 placeholder={"output-" + index} />
			<Button
				key={index}
				isIconOnly
				className="h-full w-auto aspect-square shrink-0 p-0"
				onClick={() => {
					const csvData = arrayToCSV(csv);
					const csvBlob = new Blob([csvData], {
						type: "text/csv",
					});
					const csvUrl =
						URL.createObjectURL(csvBlob);
					const link =
						document.createElement("a");
					link.href = csvUrl;
					link.download = `${name.length > 0 ? name : ("output-" + index)}.csv`;
					link.click();
				}}
			>
				<Download />
			</Button>
		</div>
	);

}

export default function Home() {
	const [files, setFiles] = useState<any>([]);
	const [input, setInput] = useState<any>([]);
	const [output, setOutput] = useState<any>([]);
	const [action, setAction] = useState<any>(null);
	const [error, setError] = useState<any>();
	const [labelChoices, setLabelChoices] = useState<any>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const appendOutput = (csv: string[][][]) => {
		setOutput((prev: any) => {
			const next = [...prev];
			next.push(...csv);
			return next;
		});
	};

	const actions: Action[] = [
		{
			name: "Filter MSANs",
			labels: ["Database", "MSANs"],
			desc: "Filtre des clients centre depuis divergence.",
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
				appendOutput([final]);
			},
		},
		{
			name: "Extraction",
			labels: ["HW", "NOKIA", "ZTE", "ZTE2", "OUTPUT"],
			desc: "Extraction des ports depuis NMS (HUAWEI, NOKIA, ZTE).",
			func: () => {
				console.log({ labelChoices, files });
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
						const HWRows = HW?.filter((row: any) => {
							return row[2]?.includes(number);
						}).forEach((row: any) => {
							const port = row[1]
								.split("/")
								.map((port: string) =>
									port.replace(/Frame:|Slot:|Port:/g, "")
								);
							const final = [row[0], ...port];
							current.push(...final);
							current.push(
								final.join("") === ogRowJoined ? "OK" : "NOK"
							);
						});
						const NOKIARows = NOKIA?.filter((row: any) =>
							row[4]?.includes(number)
						).forEach((row: any) => {
							const msan = row[0].split(":")[0];
							const port = row[0]
								.split(":")[1]
								.split(".")
								.slice(1)
								.map((port: string) =>
									port.replace(/R|S|P|LT/g, "")
								);
							const final = [msan, ...port];
							current.push(...final);
							current.push(
								final.join("") === ogRowJoined ? "OK" : "NOK"
							);
						});
						const ZTERows = ZTE?.filter(
							(row: any) =>
								row[19]?.includes(number) && row[24] == "1"
						).forEach((row: any) => {
							const msan = row[1];
							const port = [row[11], row[12], row[13]];
							const final = [msan, ...port];
							current.push(...final);
							current.push(
								final.join("") === ogRowJoined ? "OK" : "NOK"
							);
						});
						const ZTE2Rows = ZTE2?.filter(
							(row: any) =>
								row[19]?.includes(number) && row[24] == "1"
						).forEach((row: any) => {
							const msan = row[1];
							const port = [row[11], row[12], row[13]];
							const final = [msan, ...port];
							current.push(...final);
							current.push(
								final.join("") === ogRowJoined ? "OK" : "NOK"
							);
						});

						finalOutput.push(current);
					}
				});

				console.log({ finalOutput });
				appendOutput([finalOutput]);
			},
		},
		{
			name: "Contrat",
			desc: "Verification des ND contrat dans NMS (HUAWEI, NOKIA, ZTE).",
			labels: ["CONTRAT", "DEGROUPAGE", "HW", "NOKIA", "ZTE", "ZTE2"],
			func: () => {
				const finalOutput = [] as string[][];

				const CONTRAT = input[labelChoices[0]];
				const DEGROUPAGE = input[labelChoices[1]];
				const HW = input[labelChoices[2]];
				const NOKIA = input[labelChoices[3]];
				const ZTE = input[labelChoices[4]];
				const ZTE2 = input[labelChoices[5]];
				const NDMap = new Map<string, any>();

				const updateEntry = (key: any, entry: any) => {
					const current = NDMap.get(key);
					if (current) {
						NDMap.set(key, [...current, entry]);
					} else {
						NDMap.set(key, [entry]);
					}
				};

				HW?.slice(5).forEach((row: any) => {
					try {
						const number = cleanNumber(row[2]);
						const msan = row[0];
						const port = row[1]
							.split("/")
							.map((port: string) =>
								port.replace(/Frame:|Slot:|Port:/g, "")
							);
						const final = [row[0], ...port];
						updateEntry(number, final);
					} catch (e) {}
				});
				NOKIA?.slice(1).forEach((row: any) => {
					try {
						const number = cleanNumber(row[4]);
						const msan = row[0].split(":")[0];
						const port = row[0]
							.split(":")[1]
							.split(".")
							.slice(1)
							.map((port: string) =>
								port.replace(/R|S|P|LT/g, "")
							);
						const final = [msan, ...port];
						updateEntry(number, final);
					} catch (e) {}
				});
				ZTE?.filter((row: any) => row[24] == "1").forEach(
					(row: any) => {
						try {
							const number = cleanNumber(row[19]);
							const msan = row[1];
							const port = [row[11], row[12], row[13]];
							const final = [msan, ...port];
							updateEntry(number, final);
						} catch (e) {}
					}
				);
				ZTE2?.filter((row: any) => row[24] == "1").forEach(
					(row: any) => {
						try {
							const number = cleanNumber(row[19]);
							const msan = row[1];
							const port = [row[11], row[12], row[13]];
							const final = [msan, ...port];
							updateEntry(number, final);
						} catch (e) {}
					}
				);

				const lookup = (
					number: string,
					msan: string,
					port: string[]
				) => {
					const current = [number, msan, ...port];
					const ogRowJoined = current.slice(1).join("");
					const currentND = NDMap.get(number);
					if (currentND) {
						currentND.forEach((nd: any) => {
							current.push(...nd);
							current.push(
								nd.join("") === ogRowJoined ? "OK" : "NOK"
							);
						});
					}
					finalOutput.push(current);
				};

				DEGROUPAGE?.slice(4).forEach((row: any, index: number) => {
					if (
						row[1] == "SIDI OTHMANE" &&
						row[3] &&
						row[3].length > 0
					) {
						const number: string = cleanNumber(row[2]);
						const msan = row[3].split(":")[0];
						const port = row[3].split(":")[1].split("-").slice(1);
						msan.length > 0 && lookup(number, msan, port);
					}
				});

				CONTRAT?.slice(1).forEach((row: any) => {
					if (
						row[1] == "SIDI OTHMANE" &&
						row[28]?.trim().length > 0
					) {
						const number: string = cleanNumber(row[3]);
						const msan = row[8];
						const port = [row[10], row[11], row[12]];
						msan.length > 0 && lookup(number, msan, port);
					}
				});

				console.log({ finalOutput });
				appendOutput([
					finalOutput.filter(
						(row: any) => row.includes("NOK") || row.length == 5
					),
				]);
			},
		},
		{
			name: "Reverse Contrat",
			desc: "Verification des ND depuis NMS dans le contrat.",
			labels: ["CONTRAT", "DEGROUPAGE", "HW", "NOKIA", "ZTE", "ZTE2"],
			func: () => {
				const finalOutput = [] as string[][];

				const CONTRAT = input[labelChoices[0]];
				const DEGROUPAGE = input[labelChoices[1]];
				const HW = input[labelChoices[2]];
				const NOKIA = input[labelChoices[3]];
				const ZTE = input[labelChoices[4]];
				const ZTE2 = input[labelChoices[5]];
				const NDSet = new Set<string>();
				const AgainstNDSet = new Set<string>();

				DEGROUPAGE.slice(4).forEach((row: any, index: number) => {
					if (
						row[1] == "SIDI OTHMANE" &&
						row[3] &&
						row[3].length > 0
					) {
						const number: string = cleanNumber(row[2]);
						NDSet.add(number);
					}
				});

				CONTRAT.slice(1).forEach((row: any) => {
					if (row[1] == "SIDI OTHMANE") {
						const number: string = cleanNumber(row[3]);
						NDSet.add(number);
					}
				});

				HW?.slice(5).forEach((row: any) => {
					try {
						const number = cleanNumber(row[2]);
						AgainstNDSet.add(number);
					} catch (e) {}
				});
				NOKIA?.slice(1).forEach((row: any) => {
					try {
						const number = cleanNumber(row[4]);
						AgainstNDSet.add(number);
					} catch (e) {}
				});
				ZTE?.filter((row: any) => row[24] == "1").forEach(
					(row: any) => {
						try {
							const number = cleanNumber(row[19]);
							AgainstNDSet.add(number);
						} catch (e) {}
					}
				);
				ZTE2?.filter((row: any) => row[24] == "1").forEach(
					(row: any) => {
						try {
							const number = cleanNumber(row[19]);
							AgainstNDSet.add(number);
						} catch (e) {}
					}
				);

				const NDSetArray = Array.from(NDSet);
				const AgainstNDSetArray = Array.from(AgainstNDSet);
				const diff = NDSetArray.filter(
					(number) => !AgainstNDSetArray.includes(number)
				);

				finalOutput.push(...diff.map((number) => [number]));

				console.log({ finalOutput });
				appendOutput([finalOutput]);
			},
		},
		{
			name: "Port",
			desc: "Verification des ports VDSL depuis contrat.",
			labels: ["CONTRAT", "DEGROUPAGE", "OUTPUT"],
			func: () => {
				const CONTRAT = input[labelChoices[0]];
				const DEGROUPAGE = input[labelChoices[1]];
				const OUTPUT = input[labelChoices[2]];

				const finalOutput = [] as string[][];

				OUTPUT.forEach((row: string[]) => {
					const finalrow = [...row];
					const msan = row[1];
					const port = row.slice(2).join("-");

					const CONTRATRows = CONTRAT?.filter((row: any) => {
						return (
							row[8] == msan &&
							row.slice(10, 13).join("-") == port
						);
					}).forEach((row: any) => {
						finalrow.push(cleanNumber(row[3]));
						finalrow.push(
							cleanNumber(row[3]) == cleanNumber(finalrow[0])
								? "OK"
								: "NOK"
						);
					});

					const DEGROUPAGERows = DEGROUPAGE?.filter((row: any) => {
						return (
							row[5]?.split(":")[0] == msan &&
							row[5]?.endsWith("-" + port)
						);
					}).forEach((row: any) => {
						finalrow.push(cleanNumber(row[2]));
						finalrow.push(
							cleanNumber(row[2]) == cleanNumber(finalrow[0])
								? "OK"
								: "NOK"
						);
					});

					finalOutput.push(finalrow);
				});

				console.log({ finalOutput });
				appendOutput([finalOutput]);
			},
		},
		{
			name: "Filter MSAN Central",
			desc: "Supression des MSANs non rattachés au centre.",
			labels: ["OUTPUT", "MSANs"],
			func: () => {
				const OUTPUT = input[labelChoices[0]];
				const MSANs = input[labelChoices[1]];

				const newOUTPUT = OUTPUT.filter((row: any) => {
					return MSANs.some((msan: any) => {
						return msan[0] == row[1];
					});
				});

				appendOutput([newOUTPUT]);
			},
		},
		{
			name: "Nombre",
			desc: "Verification du nombre MSAM NMS.",
			labels: ["MSANs", "HW", "NOKIA", "ZTE", "ZTE2"],
			func: () => {
				const MSANs = input[labelChoices[0]];
				const HW = input[labelChoices[1]];
				const NOKIA = input[labelChoices[2]];
				const ZTE = input[labelChoices[3]];
				const ZTE2 = input[labelChoices[4]];

				const finalOutput = [] as string[][];
				const MSANMap = new Map<string, any>();

				const updateEntry = (key: any) => {
					const current = MSANMap.get(key);
					if (current != null) {
						MSANMap.set(key, current + 1);
					} else {
						MSANMap.set(key, 1);
					}
				}

				HW?.slice(5).forEach((row: any) => {
					try {
						const msan = row[0];
						console.log(msan);
						updateEntry(msan);
					} catch (e) {}
				});

				NOKIA?.slice(1).forEach((row: any) => {
					try {
						const msan = row[0].split(":")[0];
						console.log(msan);
						updateEntry(msan);
					} catch (e) {}
				});

				ZTE?.filter((row: any) => row[24] == "1").forEach(
					(row: any) => {
						try {
							const msan = row[1];
							console.log(msan);
							updateEntry(msan);
						} catch (e) {}
					}
				);

				ZTE2?.filter((row: any) => row[24] == "1").forEach(
					(row: any) => {
						try {
							const msan = row[1];
							console.log(msan);
							updateEntry(msan);
						} catch (e) {}
					}
				);

				MSANs.slice(1).forEach((row: any) => {
					try {
						const msan = row[0];
						const current = MSANMap.get(msan);
						finalOutput.push([msan, current || 0]);
					} catch (e) {}
				});

				console.log({ finalOutput });
				appendOutput([finalOutput]);
			
			},
		},
		{
			name: "Données resilies",
			desc: "Verification des ND resilies.",
			labels: ["CONTRAT", "DEGROUPAGE", "ND"],
			func: () => {
				const CONTRAT = input[labelChoices[0]];
				const DEGROUPAGE = input[labelChoices[1]];
				const ND = input[labelChoices[2]];

				const NDSet = new Set<string>();
				const NDSetFinal = new Set<string>();

				ND.forEach((row: any) => {
					try {
						const number = cleanNumber(row[0]);
						NDSet.add(number);
						NDSetFinal.add(number);
					} catch (e) {}
				});

				const finalOutputContrat = [CONTRAT[0]] as any;

				CONTRAT.slice(1).forEach((row: any) => {
					try {
						const NDLocation = 3
						const number = cleanNumber(row[NDLocation]);
						if (NDSet.has(number)) {
							finalOutputContrat.push(row);
							NDSetFinal.delete(number);
						}
					} catch (e) {}
				});

				const finalOutputDegroupage = [DEGROUPAGE[1]] as any;

				DEGROUPAGE.slice(4).forEach((row: any) => {
					try {
						const NDLocation = 2
						const number = cleanNumber(row[2]);
						if (NDSet.has(number)) {
							finalOutputDegroupage.push(row);
							NDSetFinal.delete(number);
						}
					} catch (e) {}
				});

				const finalOutputND = [["ND"]] as any;
				
				NDSetFinal.forEach((number) => {
					finalOutputND.push([number]);
				});

				console.log({ finalOutputContrat, finalOutputDegroupage, finalOutputND });
				appendOutput([finalOutputContrat, finalOutputDegroupage, finalOutputND]);
			}
		}
	];

	const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const addedFiles = e.target.files;

		if (addedFiles) {
			const newFiles = [...files] as any;

			for (let i = 0; i < addedFiles.length; i++) {
				const file = addedFiles[i];
				newFiles.push(file);
			}

			setFiles(newFiles);
			readFiles(addedFiles)
				.then((contents) => {
					const finalInput = [...input] as any;
					for (let i = 0; i < contents.length; i++) {
						const content = contents[i];
						const csv = CSVToArray(content);
						finalInput.push(csv);
					}
					setInput(finalInput);
				})
				.catch((error) => {
					console.error(error);
				});
		}
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
	};

	const handleLabelChange = (e: any, index: number) => {
		const label = e.target.value;
		setLabelChoices((prev: any) => {
			const next = [...prev];
			next[index] = label === "" ? null : label;
			return next;
		});
	};

	return (
		<main className="flex  gap-4 min-h-screen p-4">
			<input
				ref={inputRef}
				type="file"
				accept=".csv"
				onChange={handleUpload}
				className="hidden"
				multiple
			/>
			<Card className="flex-1">
				<CardHeader>Input</CardHeader>
				<Divider />
				<CardBody className="gap-2 p-4">
					{files?.map((file: any, index: number) => {
						return (
							<div
								key={index}
								className="flex justify-between items-center"
							>
								{file.name} - {file.size} bytes
							</div>
						);
					})}
				</CardBody>
				<Divider />
				<CardFooter>
					<Button onClick={() => inputRef.current?.click()}>
						Upload
					</Button>
				</CardFooter>
			</Card>
			<Card className="flex-1">
				<CardHeader>Action</CardHeader>
				<Divider />
				<CardBody className="gap-2 p-4">
					<Select
						placeholder="Select an action"
						selectedKeys={action ? [action] : []}
						onChange={handleActionChange}
					>
						{actions.map((action, index) => {
							return (
								<SelectItem key={index}>
									{action.name}
								</SelectItem>
							);
						})}
					</Select>
					<Card>
						<CardBody className="flex flex-col gap-4">
							{action != null && (
								<>
									<Divider />
									{actions[action].desc} <Divider />
								</>
							)}
						</CardBody>
					</Card>
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
										onChange={(e) =>
											handleLabelChange(e, index)
										}
									>
										{files.map(
											(file: any, index: number) => {
												return (
													<SelectItem key={index}>
														{file.name}
													</SelectItem>
												);
											}
										)}
									</Select>
								);
							}
						)}
				</CardBody>
				<Divider />
				<CardFooter>
					<Button
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
				</CardFooter>
			</Card>
			<Card className="flex-1">
				<CardHeader>Output</CardHeader>
				<Divider />
				<CardBody className="gap-2 p-4">
					{output?.map((csv: any, index: number) => <DownloadEntry key={index} csv={csv} index={index} />)}
				</CardBody>
				<Divider />
				<CardFooter>
					<Button isDisabled={output.length == 0} color="danger" onClick={() => {
						setOutput([]);
					}}>Clear</Button>
				</CardFooter>
			</Card>
		</main>
	);
}
