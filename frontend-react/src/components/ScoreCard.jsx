
import React from "react";

export default function ScoreCard({ title, score, positives = [], negatives = [] }) {
  return (
    <section className="score-card">
      <div className="score-card__header">
        <h3>{title}</h3>
        <div className="score-card__score">{score}</div>
      </div>

      <div className="score-card__body">
        <div className="score-box">
          <div className="score-box__title">잘하고 있음</div>
          <ul>
            {positives.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>

        <div className="score-box">
          <div className="score-box__title">부족한 점</div>
          <ul>
            {negatives.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
