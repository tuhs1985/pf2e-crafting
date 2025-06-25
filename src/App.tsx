import { useState } from "react";
import { buildDiscordSummary } from "./utils/earnIncome";
import type { DiscordSummaryInput, DayResultCounts } from "./utils/earnIncome";
import "./App.css";

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function App() {
  const [data, setData] = useState<DiscordSummaryInput & { days: number; hasExperiencedProfessional: boolean }>({
    character: "",
    endDate: getTodayDateString(),
    days: 7,
    skill: "",
    description: "",
    taskLevel: 0,
    proficiency: "trained",
    counts: {
      criticalSuccess: 0,
      success: 0,
      failure: 0,
      criticalFailure: 0,
    },
    rollsLink: "",
    hasExperiencedProfessional: false,
  });

  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(""); // New state for error messages
  const [showInstructions, setShowInstructions] = useState(false);
  
  const handleChange = (key: keyof typeof data, value: any) => {
    setData({ ...data, [key]: value });
  };

  const handleCountsChange = (key: keyof DayResultCounts, value: number) => {
    setData({
      ...data,
      counts: { ...data.counts, [key]: value },
    });
  };

  const getTotalResults = () =>
    data.counts.criticalSuccess +
    data.counts.success +
    data.counts.failure +
    data.counts.criticalFailure;

  const generate = () => {
    setError(""); // Clear any previous errors
    const totalResults = getTotalResults();
    if (totalResults > data.days) {
      setError(
        `The sum of all results (${totalResults}) cannot exceed the number of downtime days (${data.days}).`
      );
      setOutput(""); // Optionally clear output if invalid
      return;
    }
    const summary = buildDiscordSummary(data);
    setOutput(summary);
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="app-container">
      <div className="inner-container">
        <h1>PF2e Earn Income Generator</h1>
		        <div className="instructions-container">
          <button
            type="button"
            className="instructions-toggle"
            onClick={() => setShowInstructions((v) => !v)}
            aria-expanded={showInstructions}
            aria-controls="instructions-content"
          >
            {showInstructions ? "Hide Instructions" : "Show Instructions"}
          </button>
          {showInstructions && (
            <div className="instructions-content" id="instructions-content">
              <h2>How to Use</h2>
              <ol>
                <li>
                  <strong>Per-Day Entry:</strong> Enter the result for <b>each downtime day</b> you used. For example, if you have 7 days, you could record 3 successes, 2 failures, etc., with the total results matching the number of days.
                </li>
                <li>
                  <strong>Single-Period Entry:</strong> Enter <b>one result</b> for the entire downtime period. For example, if you only want to record the overall outcome, use a single result (e.g., 1 success for all 7 days).
                </li>
              </ol>
              <p>
                <em>
                  The total results entered should not exceed the number of downtime days.
                </em>
              </p>
            </div>
          )}
        </div>
        <form className="form-card" onSubmit={e => { e.preventDefault(); generate(); }}>
          <div>
            <label htmlFor="character">Character:</label>
            <input
              id="character"
              type="text"
              value={data.character}
              onChange={e => handleChange("character", e.target.value)}
              autoComplete="off"
            />
          </div>
			<div className="pair-row">
			  <div className="pair-field">
				<label htmlFor="days">Downtime Days:</label>
				<input
				  id="days"
				  type="number"
				  min={1}
				  value={data.days || ""}
				  onChange={e => handleChange("days", Number(e.target.value))}
				/>
			  </div>
			  <div className="pair-field">
				<label htmlFor="endDate">End Date:</label>
				<input
				  id="endDate"
				  type="date"
				  value={data.endDate}
				  onChange={e => handleChange("endDate", e.target.value)}
				/>
			  </div>
			</div>
          <div>
            <label htmlFor="skill">Skill Used:</label>
            <input
              id="skill"
              type="text"
              value={data.skill}
              onChange={e => handleChange("skill", e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={data.description}
              onChange={e => handleChange("description", e.target.value)}
            />
          </div>
			<div className="pair-row">
				<div className="pair-field">
				  <label htmlFor="taskLevel">Task Level:</label>
				  <input
					id="taskLevel"
					type="number"
					min={0}
					max={20}
					value={data.taskLevel}
					onChange={e => {
					  let value = Number(e.target.value);
					  // Clamp value between 0 and 20
					  if (isNaN(value) || e.target.value === "") {
						handleChange("taskLevel", "");
					  } else {
						if (value < 0) value = 0;
						if (value > 20) value = 20;
						handleChange("taskLevel", value);
					  }
					}}
				  />
				</div>
			  <div className="pair-field">
				<label htmlFor="proficiency">Proficiency:</label>
				<select
				  id="proficiency"
				  value={data.proficiency}
				  onChange={e => handleChange("proficiency", e.target.value)}
				>
				  <option value="trained">Trained</option>
				  <option value="expert">Expert</option>
				  <option value="master">Master</option>
				  <option value="legendary">Legendary</option>
				</select>
			  </div>
			</div>
          {/* Grouped result fields */}
          <div className="counts-row">
            <div className="counts-field">
              <label htmlFor="criticalSuccess">Critical Successes:</label>
              <input
                id="criticalSuccess"
                type="number"
                min={0}
                value={data.counts.criticalSuccess}
                onChange={e => handleCountsChange("criticalSuccess", Number(e.target.value))}
              />
            </div>
            <div className="counts-field">
              <label htmlFor="success">Successes:</label>
              <input
                id="success"
                type="number"
                min={0}
                value={data.counts.success}
                onChange={e => handleCountsChange("success", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="counts-row">
            <div className="counts-field">
              <label htmlFor="failure">Failures:</label>
              <input
                id="failure"
                type="number"
                min={0}
                value={data.counts.failure}
                onChange={e => handleCountsChange("failure", Number(e.target.value))}
              />
            </div>
            <div className="counts-field">
              <label htmlFor="criticalFailure">Critical Failures:</label>
              <input
                id="criticalFailure"
                type="number"
                min={0}
                value={data.counts.criticalFailure}
                onChange={e => handleCountsChange("criticalFailure", Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="rollsLink">Discord Rolls Link:</label>
            <input
              id="rollsLink"
              type="text"
              value={data.rollsLink}
              onChange={e => handleChange("rollsLink", e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="checkbox-row">
            <input
              id="hasExperiencedProfessional"
              type="checkbox"
              checked={data.hasExperiencedProfessional}
              onChange={e => handleChange("hasExperiencedProfessional", e.target.checked)}
            />
            <label htmlFor="hasExperiencedProfessional">
              Experienced Professional (Lore only)
            </label>
          </div>
          <button type="submit">Generate Summary</button>
        </form>

        {/* Error message display */}
        {error && (
          <div className="error-message" style={{ color: "red", marginTop: "1em" }}>
            {error}
          </div>
        )}

        {copied && (
          <div className="copied-toast">
            Summary copied to clipboard!
          </div>
        )}

        {output && (
          <pre className="output-pre">{output}</pre>
        )}

        <footer>
          <a
            href="https://github.com/tuhs1985/pf2e-earn-income"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub / Report Issues
          </a>
        </footer>
      </div>
    </div>
  );
}