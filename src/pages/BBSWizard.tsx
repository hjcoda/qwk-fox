// A 90s wizard for adding a subscription to a BBS
// Should take login details, store them securely, add subscription to data
// create folder for QWK archives, convert to SQLite for merging?
export const BBSWizard = () => {
  return (
    <>
      <p>{`It looks like you haven't set up any BBS subcriptions yet.`}</p>
      <p>{`To get started, import a QWK packet directly from the 'File' menu`}</p>
    </>
  );
};
