import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchSubjectDetail } from "../api/client";

function extractSectionImages(section = {}, mediaImages = {}) {
  const urls = [];

  const pushUrl = (value) => {
    if (!value || typeof value !== "string" || urls.includes(value)) {
      return;
    }
    urls.push(value);
  };

  normalizeImageUrls(section.image_urls).forEach(pushUrl);

  const content = section.content || section.enrichment?.detailed_explanation || "";
  if (typeof content === "string") {
    [...content.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)]
      .map((match) => match[1])
      .forEach(pushUrl);

    Object.values(mediaImages || {}).forEach((image) => {
      if (image?.url && content.includes(image.url)) {
        pushUrl(image.url);
      }
    });
  }

  return urls;
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean);
  }

  return value ? [value] : [];
}

function ImageWithFallback({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <div className="reader-image-fallback">Image unavailable</div>;
  }

  return (
    <img
      className="reader-image"
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

function SectionBlock({ section, mediaImages, type }) {
  const images = useMemo(
    () => extractSectionImages(section, mediaImages),
    [section, mediaImages],
  );

  if (type === "enriched") {
    return (
      <>
        <p>{section.enrichment?.concept_overview || "No enrichment available."}</p>
        <div className="subpanel">
          <h4>Detailed explanation</h4>
          <p>{section.enrichment?.detailed_explanation || "No detailed explanation."}</p>
        </div>
        {images.length ? (
          <div className="reader-image-grid">
            {images.map((imageUrl, index) => (
              <ImageWithFallback
                key={`${imageUrl}-${index}`}
                src={imageUrl}
                alt={`${section.section_title || "Section"} illustration ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p>{section.content || "No structured content."}</p>
      {images.length ? (
        <div className="reader-image-grid">
          {images.map((imageUrl, index) => (
            <ImageWithFallback
              key={`${imageUrl}-${index}`}
              src={imageUrl}
              alt={`${section.title || "Section"} illustration ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function SubjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("structured");
  const [activeSection, setActiveSection] = useState("");
  const sectionRefs = useRef(new Map());

  useEffect(() => {
    let active = true;

    fetchSubjectDetail(id)
      .then((response) => {
        if (!active) {
          return;
        }

        const nextRecord = response.data;
        setRecord(nextRecord);
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [id]);

  const activeStructuredUnit = useMemo(
    () => record?.structuredData?.units?.[0] || record?.structuredData || null,
    [record],
  );
  const activeEnrichedUnit = useMemo(
    () => record?.enrichedData?.units?.[0] || record?.enrichedData || null,
    [record],
  );
  const activeSections = useMemo(() => {
    if (activeTab === "enriched") {
      return activeEnrichedUnit?.sections || [];
    }

    if (activeTab === "structured") {
      return activeStructuredUnit?.sections || [];
    }

    return [];
  }, [activeEnrichedUnit?.sections, activeStructuredUnit?.sections, activeTab]);

  useEffect(() => {
    const firstSection =
      activeTab === "enriched"
        ? activeEnrichedUnit?.sections?.[0]?.section_title
        : activeStructuredUnit?.sections?.[0]?.title;

    setActiveSection(firstSection || "");
  }, [activeEnrichedUnit?.sections, activeStructuredUnit?.sections, activeTab]);

  useEffect(() => {
    if (activeTab === "raw") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry?.target?.dataset?.sectionId) {
          setActiveSection(visibleEntry.target.dataset.sectionId);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.6],
      },
    );

    sectionRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [activeSections, activeTab]);

  const mediaImages = activeStructuredUnit?.media?.images || {};
  const activeSectionIndex = activeSections.findIndex((section) => {
    const sectionId =
      activeTab === "enriched" ? section.section_title : section.title;
    return sectionId === activeSection;
  });
  const currentSectionTitle =
    activeSection ||
    (activeTab === "raw" ? "Raw JSON" : activeSections[0]?.title || activeSections[0]?.section_title || "Topic");
  const previousSection =
    activeSectionIndex > 0 ? activeSections[activeSectionIndex - 1] : null;
  const nextSection =
    activeSectionIndex >= 0 && activeSectionIndex < activeSections.length - 1
      ? activeSections[activeSectionIndex + 1]
      : null;

  function scrollToSection(sectionId) {
    const element = sectionRefs.current.get(sectionId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  }

  function moveToSiblingSection(direction) {
    const targetSection = direction === "next" ? nextSection : previousSection;
    const sectionId =
      activeTab === "enriched"
        ? targetSection?.section_title
        : targetSection?.title;

    if (sectionId) {
      scrollToSection(sectionId);
    }
  }

  if (!record) {
    return <div className="screen-center">Loading subject unit...</div>;
  }

  const groupUnits = record.subjectGroup?.units || [];
  const showUnitTabs = groupUnits.length > 1;
  const introduction =
    activeStructuredUnit?.introduction || activeEnrichedUnit?.introduction || "";
  const objectives =
    activeStructuredUnit?.objectives || activeEnrichedUnit?.objectives || [];

  return (
    <section className="page">
      <div className="hero-card reader-hero">
        <div className="reader-hero-copy">
          <p className="eyebrow">
            {`${record.board} • Class ${record.standard} • ${record.subject}`}
          </p>
          <h2>{record.subjectGroup?.subjectTitle || record.subject}</h2>
          <p className="muted">
            {record.part ? `${record.part} • ` : ""}
            {record.subjectGroup?.unitCount || 1} unit
            {(record.subjectGroup?.unitCount || 1) === 1 ? "" : "s"}
          </p>
        </div>

        <div className="reader-unit-tabs">
          {showUnitTabs ? (
            groupUnits.map((unit) => (
              <button
                key={unit.id}
                className={unit.id === record.id ? "tab active" : "tab"}
                type="button"
                onClick={() => navigate(`/subjects/${unit.id}`)}
              >
                {unit.unitLabel || unit.unitTitle}
              </button>
            ))
          ) : (
            <div className="single-unit-pill">
              <strong>{record.unitLabel}</strong>
              <span>{record.unitTitle}</span>
            </div>
          )}
        </div>
      </div>

      <div className="reader-layout">
        <aside className="reader-sidebar">
          <div className="reader-sidebar-block">
            <h3>Topics</h3>
            {activeSections.map((section) => {
              const sectionId =
                activeTab === "enriched" ? section.section_title : section.title;

              return (
                <button
                  key={sectionId}
                  className={`section-link${sectionId === activeSection ? " active" : ""}`}
                  onClick={() => scrollToSection(sectionId)}
                  type="button"
                >
                  {sectionId}
                </button>
              );
            })}
          </div>

          <div className="reader-sidebar-block">
            <h3>View</h3>
            <div className="tab-row vertical">
              <button
                className={activeTab === "structured" ? "tab active" : "tab"}
                onClick={() => setActiveTab("structured")}
                type="button"
              >
                Structured
              </button>
              <button
                className={activeTab === "enriched" ? "tab active" : "tab"}
                onClick={() => setActiveTab("enriched")}
                type="button"
              >
                Enriched
              </button>
              <button
                className={activeTab === "raw" ? "tab active" : "tab"}
                onClick={() => setActiveTab("raw")}
                type="button"
              >
                Raw JSON
              </button>
            </div>
          </div>
        </aside>

        <div className="reader-content">
          <div className="reader-sticky-nav reader-card reader-panel-card">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => moveToSiblingSection("previous")}
              disabled={!previousSection || activeTab === "raw"}
            >
              Previous
            </button>
            <div className="reader-sticky-title">
              <span className="eyebrow">Current topic</span>
              <strong>{currentSectionTitle}</strong>
            </div>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => moveToSiblingSection("next")}
              disabled={!nextSection || activeTab === "raw"}
            >
              Next
            </button>
          </div>

          {activeTab !== "raw" ? (
            <article className="reader-card reader-panel-card reader-document">
              {introduction ? (
                <section className="reader-doc-section reader-doc-intro">
                  <h3>Introduction</h3>
                  <p>{introduction}</p>
                </section>
              ) : null}

              {Array.isArray(objectives) && objectives.length ? (
                <section className="reader-doc-section reader-doc-intro">
                  <h3>Objectives</h3>
                  <ul className="reader-bullet-list">
                    {objectives.map((objective, index) => (
                      <li key={`${objective}-${index}`}>{objective}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {activeSections.map((section) => {
                const sectionId =
                  activeTab === "enriched" ? section.section_title : section.title;

                return (
                  <section
                    key={sectionId}
                    className="reader-doc-section"
                    data-section-id={sectionId}
                    ref={(element) => {
                      if (element) {
                        sectionRefs.current.set(sectionId, element);
                      } else {
                        sectionRefs.current.delete(sectionId);
                      }
                    }}
                  >
                    <h3>{sectionId}</h3>
                    <SectionBlock
                      section={section}
                      mediaImages={mediaImages}
                      type={activeTab}
                    />
                  </section>
                );
              })}
            </article>
          ) : (
            <article className="reader-card reader-panel-card raw-card raw-json-card">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </article>
          )}

          <div className="reader-footer-links">
            <Link className="ghost-btn" to="/subjects">
              Back to subjects
            </Link>
            <Link className="ghost-btn" to="/processing-tracker">
              Processing tracker
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
