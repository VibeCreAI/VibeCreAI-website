// Broadcast clips store local bone rotations and an optional vertical root offset.
export function bindAvatarMotion(T, data, bones) {
    const times = Float32Array.from(data.times);
    const tracks = Object.entries(data.rotations).map(([name, values]) => ({
        bone: bones[name],
        rotation: new T.QuaternionLinearInterpolant(times, Float32Array.from(values), 4)
    }));
    const lift = data.lift && new T.LinearInterpolant(times, Float32Array.from(data.lift), 1);
    const rotation = new T.Quaternion();

    return {
        duration: times[times.length - 1],
        sample(time, weight = 1) {
            for (const track of tracks) {
                rotation.fromArray(track.rotation.evaluate(time));
                track.bone.quaternion.slerp(rotation, weight);
            }
            return lift ? lift.evaluate(time)[0] : 0;
        }
    };
}
