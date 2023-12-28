"use client";

import { useState } from "react";

function CSVToArray(strData: string, strDelimiter: string = ",") {
	const objPattern = new RegExp(
		"(\\" +
			strDelimiter +
			"|\\r?\\n|\\r|^)" +
			'(?:"([^"]*(?:""[^"]*)*)"|' +
			'([^"\\' +
			strDelimiter +
			"\\r\\n]*))",
		"gi"
	);

	const arrData: any[] = [[]];
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

	return arrData;
}

function arrayToCSV(arrData: any[][], strDelimiter: string = ",") {
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

export default function Home() {
	const [input, setInput] = useState<any>(null);
	const [output, setOutput] = useState<any>(null);
	const [action, setAction] = useState<any>(0);

  const actions = [
    () => {
      const finalArray: any = [];
      input?.forEach((file: any) => {
        file.forEach((row: any) => {
          finalArray.push(row);
        });
      });
      console.log({finalArray});
      setOutput([finalArray]);
    },
  ]

	const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		readFiles(files)
			.then((contents) => {
        console.log(contents);
				const finalInput = [];
				for (const content of contents) {
					const rows = CSVToArray(content);
					finalInput.push(rows);
				}
        console.log( { finalInput });
        setInput(finalInput);
			})
			.catch((error) => {
				console.error(error);
			});
	};

	const handleDownload = () => {
		if (output) {
			for (let i = 0; i < output.length; i++) {
				const csv = output[i];
        console.log(csv);
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

	return (
		<main className="text-white flex flex-col gap-4">
			<input type="file" accept=".csv" onChange={handleUpload} multiple />
      <button onClick={() => actions[action]()}>Action</button>
			<button onClick={handleDownload}>Download</button>
		</main>
	);
}
