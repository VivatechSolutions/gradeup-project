import { useState } from "react";

const StudentNotes = () => {
  const [notes, setNotes] = useState(
    localStorage.getItem("notes") || ""
  );

  const saveNotes = (value: string) => {
    setNotes(value);
    localStorage.setItem("notes", value);
  };

  return (
    <div className="notes">
      <h4>My Notes</h4>
      <textarea
        value={notes}
        onChange={(e) => saveNotes(e.target.value)}
        placeholder="Write your notes here..."
      />
    </div>
  );
};

export default StudentNotes;
